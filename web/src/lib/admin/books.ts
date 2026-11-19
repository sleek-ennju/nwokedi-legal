import "server-only";
import { db } from "@/lib/db/supabase";
import { FILES_BUCKET, loadBookRows, toBook } from "@/lib/books/store";
import { BOOKS } from "@/content/books";
import type { Book } from "@/lib/books/types";
import { requireAdmin } from "./session";

export type FileInfo = { path: string; size: number; updatedAt: string | null } | null;
export type AdminBook = { book: Book; filePath: string; file: FileInfo; sold: number; revenue: { NGN: number; USD: number }; updatedAt: string | null };

const client = () => {
  const c = db();
  if (!c) throw new Error("Supabase is not configured");
  return c;
};

/** Size and date of the full book in the private bucket, or null if it isn't uploaded. */
export async function fileInfo(path: string): Promise<FileInfo> {
  await requireAdmin();
  const slash = path.lastIndexOf("/");
  const dir = slash >= 0 ? path.slice(0, slash) : "";
  const name = path.slice(slash + 1);
  const { data } = await client().storage.from(FILES_BUCKET).list(dir, { search: name, limit: 10 });
  const f = data?.find((x) => x.name === name);
  return f ? { path, size: Number(f.metadata?.size ?? 0), updatedAt: f.updated_at ?? f.created_at ?? null } : null;
}

async function salesBySlug() {
  const { data } = await client().from("orders").select("book_slug, amount_minor, currency").eq("status", "paid").limit(10000);
  const m = new Map<string, { sold: number; revenue: { NGN: number; USD: number } }>();
  for (const o of data ?? []) {
    const s = m.get(o.book_slug) ?? { sold: 0, revenue: { NGN: 0, USD: 0 } };
    s.sold++;
    s.revenue[o.currency as "NGN" | "USD"] += o.amount_minor / 100;
    m.set(o.book_slug, s);
  }
  return m;
}

/** Books for the dashboard. `starter` is true while the site still reads src/content/books.ts. */
export async function listBooksAdmin(): Promise<{ books: AdminBook[]; starter: boolean }> {
  await requireAdmin();
  const [rows, sales] = await Promise.all([loadBookRows(), salesBySlug()]);
  if (rows === null) throw new Error("Couldn't reach the database");
  const starter = rows.length === 0;
  const source = starter
    ? BOOKS.map((b) => ({ book: b, filePath: `${b.slug}.pdf`, updatedAt: null }))
    : rows.map((r) => ({ book: toBook(r), filePath: r.file_path || `${r.slug}.pdf`, updatedAt: r.updated_at ?? null }));
  const books = await Promise.all(
    source.map(async (s) => ({
      ...s,
      file: await fileInfo(s.filePath),
      sold: sales.get(s.book.slug)?.sold ?? 0,
      revenue: sales.get(s.book.slug)?.revenue ?? { NGN: 0, USD: 0 },
    }))
  );
  return { books, starter };
}

export async function getBookAdmin(slug: string): Promise<AdminBook | null> {
  await requireAdmin();
  const { data } = await client().from("books").select("*").eq("slug", slug).maybeSingle();
  if (!data) return null;
  const filePath = data.file_path || `${slug}.pdf`;
  const sales = (await salesBySlug()).get(slug);
  return { book: toBook(data), filePath, file: await fileInfo(filePath), sold: sales?.sold ?? 0, revenue: sales?.revenue ?? { NGN: 0, USD: 0 }, updatedAt: data.updated_at };
}

export async function bookHasOrders(slug: string) {
  await requireAdmin();
  const { count } = await client().from("orders").select("id", { count: "exact", head: true }).eq("book_slug", slug);
  return (count ?? 0) > 0;
}
