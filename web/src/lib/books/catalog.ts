import { cacheLife, cacheTag } from "next/cache";
import { BOOKS } from "@/content/books";
import { loadBookRows, toBook } from "./store";
import type { Book, Currency } from "./types";

/**
 * The public catalogue. Books are edited in the admin dashboard and stored in
 * the database; this read is cached and refreshed the moment a book is saved
 * (the "books" tag). If the database is unreachable or hasn't been filled yet,
 * the site falls back to the starter catalogue in src/content/books.ts, so the
 * store never goes blank.
 */
export const BOOKS_TAG = "books";

async function allBooks(): Promise<Book[]> {
  "use cache";
  cacheTag(BOOKS_TAG);
  cacheLife("hours");
  const rows = await loadBookRows();
  return rows?.length ? rows.map(toBook) : BOOKS;
}

/** Books visible on the site (drafts are hidden). */
export async function getBooks(): Promise<Book[]> {
  return (await allBooks()).filter((b) => b.status !== "draft");
}

/** A visible book by slug. Drafts are not found. */
export async function getBook(slug: string): Promise<Book | undefined> {
  return (await getBooks()).find((b) => b.slug === slug);
}

/** Any book by slug, drafts included — for titles in emails, downloads and the admin. */
export async function getAnyBook(slug: string): Promise<Book | undefined> {
  return (await allBooks()).find((b) => b.slug === slug);
}

const FMT: Record<Currency, Intl.NumberFormat> = {
  NGN: new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
};
export const formatPrice = (amount: number, currency: Currency) => FMT[currency].format(amount);

/** smallest currency unit, as payment providers expect (kobo / cents) */
export const toMinor = (amount: number) => Math.round(amount * 100);

/** Every book, drafts included (admin screens). */
export const getAllBooks = () => allBooks();
