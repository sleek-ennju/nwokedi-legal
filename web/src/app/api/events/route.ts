import { z } from "zod";

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

  const row = { ...parsed.data, country: req.headers.get("x-vercel-ip-country") ?? undefined, at: new Date().toISOString() };
  if (process.env.NODE_ENV !== "production") console.info("[event]", row);
  // TODO(phase 3): insert `row` into Supabase `events`.
  return new Response(null, { status: 204 });
}
