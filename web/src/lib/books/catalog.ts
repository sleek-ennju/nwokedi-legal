import { BOOKS } from "@/content/books";
import type { Book, Currency } from "./types";

/**
 * Catalogue access. Today it reads the local content file; in Phase 3 these
 * functions switch to the database (Supabase) without any page changing.
 */
export async function getBooks(): Promise<Book[]> {
  return BOOKS;
}

export async function getBook(slug: string): Promise<Book | undefined> {
  return BOOKS.find((b) => b.slug === slug);
}

const FMT: Record<Currency, Intl.NumberFormat> = {
  NGN: new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
};
export const formatPrice = (amount: number, currency: Currency) => FMT[currency].format(amount);

/** smallest currency unit, as payment providers expect (kobo / cents) */
export const toMinor = (amount: number) => Math.round(amount * 100);
