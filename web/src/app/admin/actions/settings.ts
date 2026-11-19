"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/db/supabase";
import { SETTINGS_TAG } from "@/lib/settings";

export type SettingsResult = { ok: boolean; message: string };

const schema = z.object({
  hours: z.coerce.number().int().min(1, "At least 1 hour").max(720, "At most 30 days (720 hours)"),
  uses: z.coerce.number().int().min(1, "At least 1 download").max(50, "At most 50 downloads"),
  open: z.boolean(),
  closedMessage: z.string().trim().max(140),
});

export async function saveSettings(_prev: SettingsResult | null, form: FormData): Promise<SettingsResult> {
  await requireAdmin();
  const parsed = schema.safeParse({
    hours: form.get("hours"),
    uses: form.get("uses"),
    open: form.get("open") === "on",
    closedMessage: form.get("closedMessage") ?? "",
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const c = db();
  if (!c) return { ok: false, message: "The database isn't connected." };
  const { hours, uses, open, closedMessage } = parsed.data;
  const { error } = await c.from("settings").upsert([
    { key: "downloads", value: { hours, uses } },
    { key: "store", value: { open, closedMessage } },
  ]);
  if (error) {
    console.error("[admin] saveSettings", error.message);
    return { ok: false, message: /settings/.test(error.message) ? "Settings storage isn't set up yet (see the notice above)." : "Couldn't save. Please try again." };
  }
  updateTag(SETTINGS_TAG);
  return { ok: true, message: open ? "Saved." : "Saved. The bookstore is paused — nobody can buy until you reopen it." };
}
