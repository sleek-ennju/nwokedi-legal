import "server-only";
import { db } from "@/lib/db/supabase";
import type { Book } from "./types";

/**
 * Books in the database. Columns hold what the database itself needs
 * (prices for checkout, the private file path for downloads, status);
 * everything editorial lives in the `content` JSON.
 */

export type BookRow = {
  slug: string;
  title: string;
  subtitle: string | null;
  price_ngn: number;
  price_usd: number | null;
  file_path: string | null;
  status: Book["status"];
  content: Omit<Book, "slug" | "title" | "subtitle" | "price" | "status">;
  created_at?: string;
  updated_at?: string;
};

export const MEDIA_BUCKET = "book-media";
export const FILES_BUCKET = "books";

export function toBook(r: BookRow): Book {
  // defaults guard against older or partial rows
  const c = r.content as Partial<BookRow["content"]>;
  return {
    author: "",
    year: "",
    format: "PDF",
    pages: 0,
    hook: "",
    synopsis: [],
    contents: [],
    forWhom: [],
    cover: {},
    sample: [],
    ...c,
    slug: r.slug,
    title: r.title,
    subtitle: r.subtitle ?? undefined,
    price: r.price_usd ? { NGN: r.price_ngn, USD: r.price_usd } : { NGN: r.price_ngn },
    status: r.status,
  };
}

export function toRow(b: Book, filePath?: string | null): Omit<BookRow, "created_at" | "updated_at"> {
  const { slug, title, subtitle, price, status, ...content } = b;
  return {
    slug,
    title,
    subtitle: subtitle || null,
    price_ngn: price.NGN,
    price_usd: price.USD || null,
    file_path: filePath ?? `${slug}.pdf`,
    status,
    content,
  };
}

/** All rows, or null when the database isn't reachable (callers then fall back). */
export async function loadBookRows(): Promise<BookRow[] | null> {
  const c = db();
  if (!c) return null;
  const { data, error } = await c.from("books").select("*").order("created_at");
  if (error) {
    console.error("[books] load", error.message);
    return null;
  }
  return data as BookRow[];
}
