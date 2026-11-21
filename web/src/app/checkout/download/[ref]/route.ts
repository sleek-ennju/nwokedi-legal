import { hasBuyerPass } from "@/lib/buyer-pass";
import { getOrder } from "@/lib/db/orders";
import { db } from "@/lib/db/supabase";
import { issueDownloadToken } from "@/lib/fulfil";

const noLeak = { "Referrer-Policy": "no-referrer", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
/** generous for a real buyer (re-downloads, other devices), a ceiling for anything automated */
const MAX_LINKS_PER_ORDER = 12;

/**
 * /checkout/download/<reference> — the thank-you page's "Download your book".
 * Only works in the browser that started the purchase (signed buyer-pass cookie),
 * only for a paid order, and mints a normal time- and use-limited token that the
 * existing /download/<token> route then serves through a 60-second signed URL.
 */
export async function GET(req: Request, { params }: RouteContext<"/checkout/download/[ref]">) {
  const { ref } = await params;
  const origin = new URL(req.url).origin;
  const invalid = (reason: string) => Response.redirect(`${origin}/download/invalid?reason=${reason}`, 303);

  if (!/^NL-[A-Z0-9-]{4,40}$/.test(ref)) return invalid("link");
  if (!(await hasBuyerPass(ref))) return invalid("device");

  const order = await getOrder(ref);
  if (!order || order.status !== "paid") return invalid("unpaid");

  const { count } = (await db()?.from("download_tokens").select("id", { count: "exact", head: true }).eq("order_id", order.id)) ?? {};
  if ((count ?? 0) >= MAX_LINKS_PER_ORDER) return invalid("limit");

  const issued = await issueDownloadToken(order);
  if (!issued) return invalid("link");
  return new Response(null, { status: 302, headers: { Location: `${origin}/download/${issued.token}`, ...noLeak } });
}
