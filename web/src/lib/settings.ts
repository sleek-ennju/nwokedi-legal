import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db/supabase";

/**
 * Store settings edited in the dashboard (table `settings`, key → JSON).
 * Cached and refreshed on save (the "settings" tag). Until the settings
 * migration has been run, sensible defaults apply and nothing breaks.
 */
export const SETTINGS_TAG = "settings";

export type Settings = {
  downloads: { hours: number; uses: number };
  store: { open: boolean; closedMessage: string };
  /** where and when to email her (the bell always shows everything) */
  alerts: { email: string; orders: boolean; enquiries: boolean; problems: boolean };
};

export const DEFAULT_SETTINGS: Settings = {
  downloads: { hours: 72, uses: 5 },
  store: { open: true, closedMessage: "" },
  alerts: { email: "", orders: true, enquiries: true, problems: true },
};

export async function loadSettings(): Promise<{ settings: Settings; tableReady: boolean }> {
  const c = db();
  if (!c) return { settings: DEFAULT_SETTINGS, tableReady: false };
  const { data, error } = await c.from("settings").select("key, value");
  if (error) return { settings: DEFAULT_SETTINGS, tableReady: false };
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return {
    tableReady: true,
    settings: {
      downloads: { ...DEFAULT_SETTINGS.downloads, ...map.downloads },
      store: { ...DEFAULT_SETTINGS.store, ...map.store },
      alerts: { ...DEFAULT_SETTINGS.alerts, ...map.alerts },
    },
  };
}

/** Cached read for the public site and the payment flow. */
export async function getSettings(): Promise<Settings> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("hours");
  return (await loadSettings()).settings;
}
