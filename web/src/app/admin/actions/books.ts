"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { BOOKS } from "@/content/books";
import { bookHasOrders, fileInfo, type FileInfo } from "@/lib/admin/books";
import { requireAdmin } from "@/lib/admin/session";
import { BOOKS_TAG } from "@/lib/books/catalog";
import { FILES_BUCKET, MEDIA_BUCKET, toRow } from "@/lib/books/store";
import type { Book } from "@/lib/books/types";
import { db } from "@/lib/db/supabase";

export type BookResult = { ok: boolean; message: string; slug?: string; errors?: Record<string, string> };

const client = () => {
  const c = db();
  if (!c) throw new Error("Supabase is not configured");
  return c;
};

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const text = (max: number) => z.string().trim().max(max);
const optText = (max: number) => text(max).optional().transform((v) => v || undefined);

/** Images may only come from this site or our own public media bucket. */
const imageSrc = z
  .string()
  .max(600)
  .refine((s) => s.startsWith("/") ? !s.startsWith("//") : s.startsWith(`${process.env.SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/`), "Image must be uploaded here");

const page = z.union([
  z.object({
    kind: z.literal("image"),
    src: imageSrc,
    alt: text(300).min(1, "Describe every sample page (for screen readers and Google)"),
    teaser: z.boolean().optional(),
    width: z.number().int().positive().max(10000).optional(),
    height: z.number().int().positive().max(10000).optional(),
  }),
  z.object({ kind: z.literal("text"), heading: optText(200), body: z.array(text(4000)).max(20), folio: optText(20) }),
]);

const schema = z.object({
  slug: z.string().regex(SLUG, "Use lowercase letters, numbers and hyphens").max(80),
  title: text(160).min(2, "Give the book a title"),
  subtitle: optText(220),
  series: optText(40),
  author: text(120).min(2, "Who wrote it?"),
  year: text(10),
  format: z.enum(["PDF", "EPUB", "PDF + EPUB"]),
  pages: z.number().int().min(1, "How many pages?").max(5000),
  price: z.object({
    NGN: z.number().int().min(0).max(10_000_000),
    USD: z.number().int().min(1).max(100_000).optional(),
  }),
  hook: text(300),
  synopsis: z.array(text(2000)).max(12),
  contents: z.array(text(300)).max(80),
  forWhom: z.array(text(200)).max(12),
  cover: z.object({
    theme: z.object({ bg: z.string().regex(HEX), ink: z.string().regex(HEX), foil: z.string().regex(HEX), spine: z.string().regex(HEX).optional() }).optional(),
    image: imageSrc.optional(),
  }),
  notice: optText(120),
  sample: z.array(page).max(40),
  status: z.enum(["published", "coming-soon", "draft"]),
  placeholder: z.boolean().optional(),
});

/** Create (mode "create") or update a book. The site refreshes as soon as it's saved. */
export async function saveBook(input: unknown, mode: "create" | "update"): Promise<BookResult> {
  await requireAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[i.path.join(".")] ??= i.message;
    return { ok: false, message: "Some details need attention.", errors };
  }
  const book = parsed.data as Book;
  if (book.status === "published" && !book.price.NGN) {
    return { ok: false, message: "A published book needs a ₦ price.", errors: { "price.NGN": "Set a price before publishing" } };
  }
  const c = client();
  const { data: existing } = await c.from("books").select("slug, file_path").eq("slug", book.slug).maybeSingle();
  if (mode === "create" && existing) return { ok: false, message: "A book with that web address already exists.", errors: { slug: "Already taken" } };
  if (mode === "update" && !existing) return { ok: false, message: "That book no longer exists." };

  const row = toRow(book, existing?.file_path);
  const { error } = mode === "create" ? await c.from("books").insert(row) : await c.from("books").update(row).eq("slug", book.slug);
  if (error) {
    console.error("[admin] saveBook", error.message);
    return { ok: false, message: "Couldn't save. Please try again." };
  }
  updateTag(BOOKS_TAG);
  const live = book.status === "draft" ? "Saved as a draft (hidden from the site)." : "Saved — it's live on the site.";
  return { ok: true, message: live, slug: book.slug };
}

/** Only unsold drafts can be deleted; anything with orders must stay for the records. */
export async function deleteBook(slug: string): Promise<BookResult> {
  await requireAdmin();
  const c = client();
  const { data } = await c.from("books").select("status").eq("slug", slug).maybeSingle();
  if (!data) return { ok: false, message: "That book no longer exists." };
  if (data.status !== "draft") return { ok: false, message: "Switch it to Draft first." };
  if (await bookHasOrders(slug)) return { ok: false, message: "This book has orders, so it's kept for your records. Leave it as a draft instead." };
  const { error } = await c.from("books").delete().eq("slug", slug);
  if (error) return { ok: false, message: "Couldn't delete. Please try again." };
  updateTag(BOOKS_TAG);
  return { ok: true, message: "Deleted." };
}

/** One-time move of the starter catalogue (src/content/books.ts) into the database. */
export async function importStarterBooks(): Promise<BookResult> {
  await requireAdmin();
  const c = client();
  const { error } = await c.from("books").upsert(BOOKS.map((b) => toRow(b)), { onConflict: "slug", ignoreDuplicates: true });
  if (error) return { ok: false, message: `Import failed: ${error.message}` };
  updateTag(BOOKS_TAG);
  return { ok: true, message: `Imported ${BOOKS.length} book${BOOKS.length === 1 ? "" : "s"}. You can edit ${BOOKS.length === 1 ? "it" : "them"} now.` };
}

export type UploadTarget = { ok: true; url: string; publicUrl?: string; path: string } | { ok: false; message: string };

const IMAGE_TYPES: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

/**
 * A one-time signed URL the browser uploads to directly (so large PDFs never pass
 * through the server). Images go to the public media bucket; the full book goes to
 * the private bucket as <slug>.pdf.
 */
export async function uploadTarget(slug: string, kind: "sample" | "cover" | "file", contentType: string): Promise<UploadTarget> {
  await requireAdmin();
  if (!SLUG.test(slug)) return { ok: false, message: "Give the book a title (and web address) first." };
  const storage = client().storage;

  if (kind === "file") {
    if (contentType !== "application/pdf") return { ok: false, message: "The book must be a PDF." };
    const path = `${slug}.pdf`;
    const { data, error } = await storage.from(FILES_BUCKET).createSignedUploadUrl(path, { upsert: true });
    return error || !data ? { ok: false, message: "Couldn't start the upload." } : { ok: true, url: data.signedUrl, path };
  }

  const ext = IMAGE_TYPES[contentType];
  if (!ext) return { ok: false, message: "Use a WebP, JPEG or PNG image." };
  const path = `${slug}/${kind}/${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { data, error } = await storage.from(MEDIA_BUCKET).createSignedUploadUrl(path, { upsert: false });
  if (error || !data) return { ok: false, message: "Couldn't start the upload." };
  return { ok: true, url: data.signedUrl, path, publicUrl: storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl };
}

export async function bookFileInfo(slug: string): Promise<FileInfo> {
  await requireAdmin();
  if (!SLUG.test(slug)) return null;
  const { data } = await client().from("books").select("file_path").eq("slug", slug).maybeSingle();
  return fileInfo(data?.file_path || `${slug}.pdf`);
}

/** A 5-minute private link so the editor can open the uploaded book to pick sample pages. */
export async function bookFileReadUrl(slug: string): Promise<string | null> {
  await requireAdmin();
  if (!SLUG.test(slug)) return null;
  const c = client();
  const { data: row } = await c.from("books").select("file_path").eq("slug", slug).maybeSingle();
  const { data } = await c.storage.from(FILES_BUCKET).createSignedUrl(row?.file_path || `${slug}.pdf`, 300);
  return data?.signedUrl ?? null;
}
