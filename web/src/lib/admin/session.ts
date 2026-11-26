import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db/supabase";

/**
 * Admin sign-in, in two steps, both checked by Supabase Auth:
 *   1. email + password  → a short-lived "pending" cookie holding the Supabase session
 *   2. 6-digit authenticator code (TOTP) → Supabase raises the session to aal2
 * Only then do we issue our own admin session: an HMAC-signed, httpOnly cookie
 * (user id + expiry). Every page, action and export re-checks it AND the admins
 * table, so removing someone from `admins` locks them out on their next click.
 *
 * The signing key is derived from the service-role key, so no extra secret is
 * needed, and rotating that key also signs everyone out.
 *
 * "Sign out everywhere": each cookie carries when it was issued (iat). When the
 * password changes or is reset, we record that moment per admin (settings key
 * `admin_sessions`), and any cookie issued before it stops working.
 */

export const SESSION_COOKIE = "nl_admin";
export const PENDING_COOKIE = "nl_admin_pending";
const SESSION_HOURS = 12;
export const PENDING_MINUTES = 10;

const key = () => {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Supabase not configured");
  return Buffer.from(hkdfSync("sha256", secret, "nwokedi-legal", "admin-session-v1", 32));
};

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const mac = (payload: string) => createHmac("sha256", key()).update(payload).digest("base64url");

export function sign(data: object): string {
  const payload = b64(JSON.stringify(data));
  return `${payload}.${mac(payload)}`;
}

export function unsign<T>(value: string | undefined): T | null {
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(mac(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as T & { exp: number };
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

export const cookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/admin",
  maxAge: maxAgeSeconds,
});

export async function startSession(userId: string, email: string, name?: string) {
  const exp = Date.now() + SESSION_HOURS * 3600_000;
  const jar = await cookies();
  const iat = Date.now();
  jar.set(SESSION_COOKIE, sign({ uid: userId, email, name: name || undefined, iat, exp }), cookieOptions(SESSION_HOURS * 3600));
  jar.delete({ name: PENDING_COOKIE, path: "/admin" });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete({ name: SESSION_COOKIE, path: "/admin" });
  jar.delete({ name: PENDING_COOKIE, path: "/admin" });
}

/** A fresh Supabase client for auth calls only (never persists anything server-side). */
export const authClient = () =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

export async function isAdminUser(userId: string): Promise<boolean> {
  const c = db();
  if (!c) return false;
  const { data, error } = await c.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (error) console.error("[admin] isAdminUser", error.message);
  return Boolean(data);
}

const REVOKED = "admin_sessions";

/** When this admin last signed out everywhere (ms), or 0. */
async function sessionsValidAfter(userId: string): Promise<number> {
  const c = db();
  if (!c) return 0;
  const { data } = await c.from("settings").select("value").eq("key", REVOKED).maybeSingle();
  const at = (data?.value as Record<string, number> | undefined)?.[userId];
  return typeof at === "number" ? at : 0;
}

/**
 * Ends every dashboard session this admin has, on every device. Call
 * startSession straight after to keep the current device signed in.
 */
export async function signOutEverywhere(userId: string): Promise<boolean> {
  const c = db();
  if (!c) return false;
  const { data } = await c.from("settings").select("value").eq("key", REVOKED).maybeSingle();
  const value = { ...((data?.value as Record<string, number> | undefined) ?? {}), [userId]: Date.now() };
  const { error } = await c.from("settings").upsert({ key: REVOKED, value });
  if (error) console.error("[admin] signOutEverywhere", error.message);
  return !error;
}

export type Admin = { id: string; email: string; name?: string };

/** The signed-in admin for this request, or null. Deduplicated per request. */
export const getAdmin = cache(async (): Promise<Admin | null> => {
  await connection(); // the expiry check reads the clock: always at request time
  const s = unsign<{ uid: string; email: string; name?: string; iat?: number }>((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const [isAdmin, after] = await Promise.all([isAdminUser(s.uid), sessionsValidAfter(s.uid)]);
  if (!isAdmin || (s.iat ?? 0) < after) return null;
  return { id: s.uid, email: s.email, name: s.name };
});

/** Use at the top of every admin page, action and route handler. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
