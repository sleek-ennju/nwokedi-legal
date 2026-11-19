"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getBook, toMinor } from "@/lib/books/catalog";
import { getSettings } from "@/lib/settings";
import { initialize, paystackConfigured } from "@/lib/payments/paystack";
import { createPendingOrder } from "@/lib/db/store";
import { dbConfigured } from "@/lib/db/supabase";

export type CheckoutState = {
  status: "idle" | "redirect" | "error";
  url?: string;
  message?: string;
  fieldErrors?: Partial<Record<"name" | "email", string>>;
  values?: { name: string; email: string };
};

const schema = z.object({
  slug: z.string().min(1).max(120),
  name: z.string().trim().min(2, "Please enter your name.").max(120),
  email: z.string().trim().email("Please enter a valid email — your book is sent there.").max(200),
  currency: z.enum(["NGN", "USD"]),
});

const reference = () =>
  `NL-${Date.now().toString(36).toUpperCase()}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase()}`;

/**
 * Starts a purchase. The price always comes from the catalogue on the server —
 * never from the browser. With Paystack keys it returns the hosted checkout URL;
 * without them (local development only) it returns a clearly-labelled test-mode URL.
 */
export async function startCheckout(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const values = { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? "") };
  const parsed = schema.safeParse({
    slug: form.get("slug"),
    name: values.name,
    email: values.email,
    currency: form.get("currency") ?? "NGN",
  });
  if (!parsed.success) {
    const fe: CheckoutState["fieldErrors"] = {};
    for (const i of parsed.error.issues) {
      const k = i.path[0] as "name" | "email";
      if (k === "name" || k === "email") fe[k] ??= i.message;
    }
    return { status: "error", message: "Please check your details.", fieldErrors: fe, values };
  }

  const { slug, name, email, currency } = parsed.data;
  const book = await getBook(slug);
  if (!book || book.status !== "published") return { status: "error", message: "This book isn't available yet.", values };
  const { store } = await getSettings();
  if (!store.open) return { status: "error", message: store.closedMessage || "The bookstore is paused for a moment. Please check back soon.", values };
  const amount = book.price[currency];
  if (!amount) return { status: "error", message: `This book isn't sold in ${currency}.`, values };

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const ref = reference();
  const callbackUrl = `${origin}/checkout/success?ref=${encodeURIComponent(ref)}&book=${encodeURIComponent(slug)}`;

  // record the order as "pending" before the buyer leaves for Paystack; the webhook
  // later marks it paid. In production an order must be recorded to sell at all.
  const recorded = await createPendingOrder({
    reference: ref,
    bookSlug: slug,
    name,
    email,
    amountMinor: toMinor(amount),
    currency,
    meta: { title: book.title, mock: !paystackConfigured() },
  });
  if (!recorded && process.env.NODE_ENV === "production") {
    return {
      status: "error",
      message: dbConfigured() ? "We couldn't start your order. Please try again." : "The store is being set up. Please check back shortly.",
      values,
    };
  }

  if (!paystackConfigured()) {
    if (process.env.NODE_ENV === "production") {
      return { status: "error", message: "Payments are being set up. Please check back shortly.", values };
    }
    return { status: "redirect", url: `${callbackUrl}&mock=1` };
  }

  const r = await initialize({
    email,
    amountMinor: toMinor(amount),
    currency,
    reference: ref,
    callbackUrl,
    metadata: { slug, name, title: book.title },
  });
  if ("error" in r) return { status: "error", message: r.error, values };
  return { status: "redirect", url: r.url };
}
