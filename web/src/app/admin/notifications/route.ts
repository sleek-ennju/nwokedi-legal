import { getAdmin } from "@/lib/admin/session";
import { getFeed } from "@/lib/admin/notifications";

/** The bell polls this (every 30 s while the tab is open). Admin-only; never cached. */
export async function GET() {
  if (!(await getAdmin())) return new Response("Not found", { status: 404 });
  const feed = await getFeed();
  return Response.json(feed, { headers: { "Cache-Control": "private, no-store" } });
}
