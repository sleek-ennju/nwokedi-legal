import { z } from "zod";
import { recordEvent } from "@/lib/db/store";

const Event = z.object({
  e: z.enum([
    "store_view",
    "book_view",
    "sample_open",
    "sample_page",
    "sample_complete",
    "checkout_start",
    "checkout_submit",
    "payment_success",
  ]),
  sid: z.string().max(64),
  slug: z.string().max(120).optional(),
  n: z.number().int().min(0).max(10000).optional(),
  currency: z.enum(["NGN", "USD"]).optional(),
  ref: z.string().max(200).optional(),
  utm: z.string().max(100).optional(),
  m: z.enum(["mobile", "desktop"]).optional(),
});

/**
 * Store analytics intake. Validates and (Phase 3) writes to the `events` table
 * that powers the admin dashboard. Country comes from the edge header; no IP is stored.
 */
export async function POST(req: Request) {
  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const parsed = Event.safeParse(data);
  if (!parsed.success) return new Response(null, { status: 400 });

  const d = parsed.data;
  const country = req.headers.get("x-vercel-ip-country") ?? undefined;
  if (process.env.NODE_ENV !== "production") console.info("[event]", d.e, d.slug ?? "", d.n ?? "");
  await recordEvent({
    event: d.e,
    sid: d.sid,
    slug: d.slug,
    n: d.n,
    currency: d.currency,
    referrer: d.ref,
    utm: d.utm,
    device: d.m,
    country,
  });
  return new Response(null, { status: 204 });
}
