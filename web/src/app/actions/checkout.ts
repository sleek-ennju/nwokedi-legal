"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getBook, toMinor } from "@/lib/books/catalog";
import { initialize, paystackConfigured } from "@/lib/payments/paystack";

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
  const amount = book.price[currency];
  if (!amount) return { status: "error", message: `This book isn't sold in ${currency}.`, values };

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const ref = reference();
  const callbackUrl = `${origin}/checkout/success?ref=${encodeURIComponent(ref)}&book=${encodeURIComponent(slug)}`;

  // TODO(phase 2b): create a `pending` order row (ref, slug, name, email, amount, currency) before redirecting.

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
