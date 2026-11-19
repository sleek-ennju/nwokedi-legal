import "server-only";
import { db } from "./supabase";

export type Order = {
  id: string;
  reference: string;
  book_slug: string;
  name: string;
  email: string;
  amount_minor: number;
  currency: "NGN" | "USD";
  status: "pending" | "paid" | "failed" | "abandoned" | "refunded";
  paid_at: string | null;
  delivered_at: string | null;
  meta: Record<string, unknown>;
};

export async function getOrder(reference: string): Promise<Order | null> {
  const c = db();
  if (!c) return null;
  const { data, error } = await c.from("orders").select("*").eq("reference", reference).maybeSingle();
  if (error) console.error("[db] getOrder", error.message);
  return (data as Order) ?? null;
}

/** pending/failed/abandoned → paid. Idempotent: an already-paid order is returned unchanged. */
export async function markPaid(reference: string, providerMeta: Record<string, unknown>): Promise<Order | null> {
  const c = db();
  if (!c) return null;
  const { data, error } = await c
    .from("orders")
    .update({ status: "paid", paid_at: new Date().toISOString(), meta: providerMeta })
    .eq("reference", reference)
    .in("status", ["pending", "failed", "abandoned"])
    .select("*")
    .maybeSingle();
  if (error) console.error("[db] markPaid", error.message);
  return (data as Order) ?? (await getOrder(reference));
}

export async function markStatus(reference: string, status: "failed" | "abandoned") {
  const c = db();
  if (!c) return;
  const { error } = await c.from("orders").update({ status }).eq("reference", reference).eq("status", "pending");
  if (error) console.error("[db] markStatus", error.message);
}

/**
 * Claim the right to deliver an order exactly once. Sets delivered_at only if it
 * is still empty — so if the webhook and the thank-you page race, only one wins
 * and the buyer gets one email, not two.
 */
export async function claimDelivery(orderId: string): Promise<boolean> {
  const c = db();
  if (!c) return false;
  const { data, error } = await c
    .from("orders")
    .update({ delivered_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "paid")
    .is("delivered_at", null)
    .select("id");
  if (error) console.error("[db] claimDelivery", error.message);
  return Boolean(data && data.length);
}

/** Undo a claim if sending failed, so the next attempt (webhook retry / page load) can try again. */
export async function releaseDelivery(orderId: string) {
  const c = db();
  if (!c) return;
  await c.from("orders").update({ delivered_at: null }).eq("id", orderId);
}

export async function saveTokenHash(orderId: string, tokenHash: string, expiresAt: Date, maxUses: number) {
  const c = db();
  if (!c) return false;
  const { error } = await c
    .from("download_tokens")
    .insert({ order_id: orderId, token_hash: tokenHash, expires_at: expiresAt.toISOString(), max_uses: maxUses });
  if (error) console.error("[db] saveTokenHash", error.message);
  return !error;
}

export type Consumed = { order_id: string; book_slug: string; file_path: string | null; uses_left: number };

/** Atomically validate and use one download. Null if invalid, expired, used up, or unpaid. */
export async function consumeDownload(tokenHash: string): Promise<Consumed | null> {
  const c = db();
  if (!c) return null;
  const { data, error } = await c.rpc("consume_download", { p_token_hash: tokenHash });
  if (error) console.error("[db] consumeDownload", error.message);
  const row = Array.isArray(data) ? data[0] : null;
  return (row as Consumed) ?? null;
}

/** Short-lived signed URL for a file in the private "books" bucket. */
export async function signedBookUrl(path: string, downloadName: string, seconds = 60): Promise<string | null> {
  const c = db();
  if (!c) return null;
  const { data, error } = await c.storage.from("books").createSignedUrl(path, seconds, { download: downloadName });
  if (error) console.error("[storage] signedBookUrl", error.message);
  return data?.signedUrl ?? null;
}
