"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/session";
import { ARTICLES_TAG, PRACTICE_OPTIONS } from "@/lib/articles/catalog";
import { MEDIA_BUCKET } from "@/lib/books/store";
import { db } from "@/lib/db/supabase";

export type ArticleResult = { ok: boolean; message: string; slug?: string; errors?: Record<string, string> };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const mediaUrl = z
  .string()
  .max(600)
  .refine((s) => s.startsWith(`${process.env.SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/`), "Upload the image here");

const schema = z.object({
  slug: z.string().regex(SLUG, "Use lowercase letters, numbers and hyphens").max(90),
  title: z.string().trim().min(4, "Give the article a title").max(180),
  excerpt: z.string().trim().max(320),
  body: z.string().max(60_000),
  practice: z.enum(PRACTICE_OPTIONS.map((p) => p.id) as [string, ...string[]]),
  cover_url: mediaUrl.nullable(),
  cover_alt: z.string().trim().max(200).nullable(),
  featured: z.boolean(),
  /** what the writer pressed */
  intent: z.enum(["draft", "publish", "schedule"]),
  /** ISO time, required to schedule */
  publishAt: z.string().datetime().nullable(),
});

/** Save as draft, publish now, or schedule. The site refreshes the moment it's saved. */
export async function saveArticle(input: unknown, mode: "create" | "update"): Promise<ArticleResult> {
  await requireAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[i.path.join(".")] ??= i.message;
    return { ok: false, message: "Some details need attention.", errors };
  }
  const a = parsed.data;
  const c = db();
  if (!c) return { ok: false, message: "The database isn't connected." };

  if (a.intent !== "draft") {
    if (a.body.trim().split(/\s+/).length < 60) return { ok: false, message: "That's a little short to publish — write at least a few paragraphs.", errors: { body: "Too short to publish" } };
    if (!a.excerpt) return { ok: false, message: "Add a short summary: it's what readers and Google see first.", errors: { excerpt: "Needed to publish" } };
  }
  if (a.intent === "schedule" && (!a.publishAt || Date.parse(a.publishAt) <= Date.now() + 60_000)) {
    return { ok: false, message: "Pick a date and time in the future to schedule.", errors: { publishAt: "Must be in the future" } };
  }

  const { data: existing, error: readErr } = await c.from("articles").select("slug, status, publish_at").eq("slug", a.slug).maybeSingle();
  if (readErr) return { ok: false, message: /articles/.test(readErr.message) ? "Articles storage isn't set up yet (one database update to run)." : "Couldn't save. Please try again." };
  if (mode === "create" && existing) return { ok: false, message: "An article with that web address already exists.", errors: { slug: "Already taken" } };
  if (mode === "update" && !existing) return { ok: false, message: "That article no longer exists." };

  // publishing keeps an existing past date (so "Update" doesn't re-date the piece)
  const keepDate = existing?.status === "published" && existing.publish_at && Date.parse(existing.publish_at) <= Date.now();
  const status = a.intent === "draft" ? "draft" : "published";
  const publish_at = a.intent === "schedule" ? a.publishAt : a.intent === "publish" ? (keepDate ? existing!.publish_at : new Date().toISOString()) : (existing?.publish_at ?? null);

  const row = {
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    body: a.body,
    practice: a.practice,
    cover_url: a.cover_url,
    cover_alt: a.cover_alt || null,
    featured: a.featured,
    status,
    publish_at,
  };
  const { error } = mode === "create" ? await c.from("articles").insert(row) : await c.from("articles").update(row).eq("slug", a.slug);
  if (error) {
    console.error("[admin] saveArticle", error.message);
    return { ok: false, message: "Couldn't save. Please try again." };
  }
  if (a.featured) await c.from("articles").update({ featured: false }).neq("slug", a.slug).eq("featured", true);
  updateTag(ARTICLES_TAG);

  const when = publish_at ? new Date(publish_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }) : "";
  const message = a.intent === "draft" ? "Draft saved. It's private until you publish." : a.intent === "schedule" ? `Scheduled for ${when} (Lagos time).` : "Published — it's live on the site.";
  return { ok: true, message, slug: a.slug };
}

/** Delete an article for good (drafts and published pieces alike — she's the author). */
export async function deleteArticle(slug: string): Promise<ArticleResult> {
  await requireAdmin();
  const { error } = (await db()?.from("articles").delete().eq("slug", slug)) ?? { error: { message: "no db" } };
  if (error) return { ok: false, message: "Couldn't delete. Please try again." };
  updateTag(ARTICLES_TAG);
  return { ok: true, message: "Deleted." };
}

/** A one-time signed URL to upload an article image (cover or inline) to the public media bucket. */
export async function articleImageTarget(slug: string, contentType: string): Promise<{ ok: true; url: string; publicUrl: string } | { ok: false; message: string }> {
  await requireAdmin();
  if (!SLUG.test(slug)) return { ok: false, message: "Give the article a title first." };
  if (contentType !== "image/webp") return { ok: false, message: "Images are converted to WebP before upload." };
  const storage = db()?.storage;
  if (!storage) return { ok: false, message: "Storage isn't connected." };
  const path = `articles/${slug}/${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.webp`;
  const { data, error } = await storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, message: "Couldn't start the upload." };
  return { ok: true, url: data.signedUrl, publicUrl: storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl };
}
