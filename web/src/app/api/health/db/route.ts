import { pingDb } from "@/lib/db/store";

/** Development-only database check: GET /api/health/db. Returns 404 in production. */
export async function GET() {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  const r = await pingDb();
  return Response.json(r, { status: r.ok ? 200 : 503 });
}
