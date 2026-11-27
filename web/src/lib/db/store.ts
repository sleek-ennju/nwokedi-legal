import "server-only";
import { db } from "./supabase";

/**
 * Typed data access for the site. Every function is a no-op (returns null/false)
 * when Supabase isn't configured, and logs — never throws — on database errors,
 * so a database hiccup can't take down a page or a payment redirect.
 */

export type NewOrder = {
  reference: string;
  bookSlug: string;
  name: string;
  email: string;
  amountMinor: number;
  currency: "NGN" | "USD";
  meta?: Record<string, unknown>;
};

export async function createPendingOrder(o: NewOrder): Promise<boolean> {
  const c = db();
  if (!c) return false;
  const { error } = await c.from("orders").insert({
    reference: o.reference,
    book_slug: o.bookSlug,
    name: o.name,
    email: o.email.toLowerCase(),
    amount_minor: o.amountMinor,
    currency: o.currency,
    meta: o.meta ?? {},
  });
  if (error) console.error("[db] createPendingOrder", error.message);
  return !error;
}

export type EventRow = {
  event: string;
  sid: string;
  slug?: string;
  n?: number;
  currency?: string;
  referrer?: string;
  utm?: string;
  device?: "mobile" | "desktop";
  country?: string;
};

export async function recordEvent(e: EventRow): Promise<void> {
  const c = db();
  if (!c) return;
  const { error } = await c.from("events").insert(e);
  if (error) console.error("[db] recordEvent", error.message);
}

export type EnquiryRow = { name: string; email: string; phone?: string; practice: string; message: string };

export async function saveEnquiry(e: EnquiryRow, opts: { archived?: boolean } = {}): Promise<boolean> {
  const c = db();
  if (!c) return false;
  const { error } = await c
    .from("enquiries")
    .insert({ ...e, email: e.email.toLowerCase(), phone: e.phone || null, ...(opts.archived ? { status: "archived" } : {}) });
  if (error) console.error("[db] saveEnquiry", error.message);
  return !error;
}

/** Health check used by /api/health/db in development. */
export async function pingDb(): Promise<{ ok: boolean; message: string }> {
  const c = db();
  if (!c) return { ok: false, message: "Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)." };
  const tables = ["orders", "download_tokens", "events", "enquiries", "books", "admins"];
  for (const t of tables) {
    const { error } = await c.from(t).select("*", { count: "exact", head: true });
    if (error) return { ok: false, message: `Table "${t}": ${error.message} — has the migration been run?` };
  }
  const { data: buckets, error } = await c.storage.listBuckets();
  if (error) return { ok: false, message: `Storage: ${error.message}` };
  const books = buckets?.find((b) => b.id === "books");
  if (!books) return { ok: false, message: 'Storage bucket "books" is missing — has the migration been run?' };
  if (books.public) return { ok: false, message: 'Storage bucket "books" is PUBLIC — it must be private.' };
  return { ok: true, message: `Connected. ${tables.length} tables present; private "books" bucket ready.` };
}
