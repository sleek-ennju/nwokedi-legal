import "server-only";
import { getBook } from "@/lib/books/catalog";
import { newToken, sha256 } from "@/lib/crypto/tokens";
import { claimDelivery, getOrder, markPaid, markStatus, releaseDelivery, saveTokenHash, type Order } from "@/lib/db/orders";
import { sendMail } from "@/lib/email/send";
import { bookDeliveryEmail } from "@/lib/email/templates";
import { paystackConfigured, verify } from "@/lib/payments/paystack";
import { site } from "@/lib/site";

export const LINK_HOURS = 72;
export const LINK_USES = 5;

export type FulfilResult =
  | { state: "delivered" | "already-delivered"; order: Order }
  | { state: "pending" | "failed"; order: Order | null }
  | { state: "error"; reason: string };

const publicOrigin = (fallback?: string) => process.env.PUBLIC_ORIGIN || fallback || site.url;

/**
 * The single path from "Paystack says paid" to "book in the buyer's inbox".
 * Called by the webhook (primary) and by the thank-you page (fallback), so it
 * is safe to run any number of times:
 *   1. re-verify the transaction with Paystack (never trust the caller),
 *   2. check amount + currency match our order exactly,
 *   3. mark the order paid (idempotent),
 *   4. claim delivery atomically, issue a token, send the email.
 */
export async function fulfilOrder(reference: string, opts: { origin?: string; mock?: boolean } = {}): Promise<FulfilResult> {
  const order = await getOrder(reference);
  if (!order) return { state: "error", reason: "unknown order" };

  let paidOrder: Order | null = order.status === "paid" ? order : null;

  if (!paidOrder) {
    if (opts.mock && process.env.NODE_ENV !== "production" && order.meta?.mock === true) {
      paidOrder = await markPaid(reference, { ...order.meta, verified: "dev-mock" });
    } else {
      if (!paystackConfigured()) return { state: "pending", order };
      const v = await verify(reference);
      if (!v) return { state: "pending", order };
      if (v.status !== "success") {
        if (v.status === "failed" || v.status === "abandoned") {
          await markStatus(reference, v.status);
          return { state: "failed", order };
        }
        return { state: "pending", order };
      }
      if (v.amountMinor !== order.amount_minor || v.currency !== order.currency) {
        console.error("[fulfil] amount/currency mismatch", { reference, paid: [v.amountMinor, v.currency], expected: [order.amount_minor, order.currency] });
        return { state: "error", reason: "amount mismatch" };
      }
      paidOrder = await markPaid(reference, { ...order.meta, verified: "paystack", paystack_email: v.email });
    }
  }
  if (!paidOrder || paidOrder.status !== "paid") return { state: "error", reason: "could not mark paid" };

  // exactly-once delivery
  if (!(await claimDelivery(paidOrder.id))) return { state: "already-delivered", order: paidOrder };

  try {
    if (!(await sendDownloadLink(paidOrder, opts.origin))) throw new Error("link not sent");
    return { state: "delivered", order: paidOrder };
  } catch (e) {
    console.error("[fulfil] delivery failed, releasing claim for retry", reference, e);
    await releaseDelivery(paidOrder.id);
    return { state: "error", reason: "delivery failed" };
  }
}

/**
 * Issue a fresh download link (new token with the full time and use allowance) and email it.
 * Used for first delivery and by the admin "resend" action. Older links keep working until they expire.
 */
export async function sendDownloadLink(order: Order, origin?: string): Promise<boolean> {
  if (order.status !== "paid") return false;
  const book = await getBook(order.book_slug);
  const token = newToken();
  const expires = new Date(Date.now() + LINK_HOURS * 3600_000);
  if (!(await saveTokenHash(order.id, sha256(token), expires, LINK_USES))) return false;

  const base = publicOrigin(origin);
  const mail = bookDeliveryEmail({
    name: order.name,
    title: book?.title ?? "your book",
    url: `${base}/download/${token}`,
    reference: order.reference,
    expiresHours: LINK_HOURS,
    maxUses: LINK_USES,
    logoUrl: `${base}/brand/email-logo.png`,
  });
  return sendMail({ to: order.email, ...mail, replyTo: process.env.CONSULT_INBOX || undefined });
}
