import "server-only";
import { db } from "@/lib/db/supabase";
import { requireAdmin } from "./session";

export type NotificationRow = {
  id: string;
  kind: "order_paid" | "enquiry_new" | "delivery_failed" | "order_refunded";
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

/** Latest notifications + unread count. `ready` is false until the notifications migration has run. */
export async function getFeed(limit = 30): Promise<{ items: NotificationRow[]; unread: number; ready: boolean }> {
  await requireAdmin();
  const c = db();
  if (!c) return { items: [], unread: 0, ready: false };
  const [list, unread] = await Promise.all([
    c.from("notifications").select("id, kind, title, body, href, read_at, created_at").order("created_at", { ascending: false }).limit(limit),
    c.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);
  if (list.error) return { items: [], unread: 0, ready: false };
  return { items: (list.data ?? []) as NotificationRow[], unread: unread.count ?? 0, ready: true };
}

export async function markRead(ids: string[] | "all") {
  await requireAdmin();
  const c = db();
  if (!c) return;
  const q = c.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  const { error } = ids === "all" ? await q : await q.in("id", ids.slice(0, 100));
  if (error) console.error("[admin] markRead", error.message);
}
