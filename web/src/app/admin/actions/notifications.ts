"use server";

import { markRead } from "@/lib/admin/notifications";

/** Mark one, some, or all notifications as read. */
export async function readNotifications(ids: string[] | "all") {
  await markRead(Array.isArray(ids) ? ids.filter((i) => /^[0-9a-f-]{36}$/.test(i)) : "all");
}
