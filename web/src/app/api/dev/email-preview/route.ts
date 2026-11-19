import { bookDeliveryEmail } from "@/lib/email/templates";
import { LINK_HOURS, LINK_USES } from "@/lib/fulfil";

/** Development-only: GET /api/dev/email-preview renders the book-delivery email. 404 in production. */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  const origin = new URL(req.url).origin;
  const { html } = bookDeliveryEmail({
    name: "Ada Obi",
    title: "Own What You Make",
    url: `${origin}/download/preview-token`,
    reference: "NL-PREVIEW-0001",
    expiresHours: LINK_HOURS,
    maxUses: LINK_USES,
    logoUrl: `${origin}/brand/email-logo.png`,
  });
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
