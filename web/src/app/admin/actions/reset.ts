"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db/supabase";
import { sendMail } from "@/lib/email/send";
import { passwordResetEmail } from "@/lib/email/templates";
import { site } from "@/lib/site";
import { authClient, cookieOptions, isAdminUser, sign, signOutEverywhere, unsign } from "@/lib/admin/session";

/**
 * Forgotten password, in two halves:
 *   1. /admin/forgot: she enters her email. If it belongs to an admin, we email a
 *      one-time Supabase recovery link (sent through Resend, in the house style).
 *      The reply is the same either way, so the page can't be used to find admins.
 *   2. /admin/reset?t=…: the new password twice AND a code from her authenticator
 *      app, so someone who gets into her inbox still can't take the dashboard.
 *
 * Opening the link does nothing; the token is only used when the form is sent,
 * so mail scanners that "click" links can't use it up. Once used, the recovery
 * session is held in a short signed cookie, so a mistyped code can be retried.
 * A successful reset signs her out everywhere.
 */

export type ForgotState = { sent: boolean; error?: string; email?: string };
export type ResetState = { done: boolean; expired?: boolean; error?: string; errors?: Record<string, string> } | null;

const RESET_COOKIE = "nl_admin_reset";
const RESET_MINUTES = 15;
const LINK_MINUTES = 60; // Supabase's default email-link expiry
const RESEND_GAP_MS = 2 * 60_000;
const THROTTLE_KEY = "admin_resets";

const slow = () => new Promise((r) => setTimeout(r, 500 + Math.random() * 500));

/** Links always point at the real site in production; locally, at whatever is running. */
async function origin() {
  if (process.env.PUBLIC_ORIGIN) return process.env.PUBLIC_ORIGIN.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return site.url;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

/** One email per admin every two minutes, however often the form is sent. */
async function tooSoon(userId: string): Promise<boolean> {
  const c = db();
  if (!c) return false;
  const { data } = await c.from("settings").select("value").eq("key", THROTTLE_KEY).maybeSingle();
  const log = (data?.value as Record<string, number> | undefined) ?? {};
  if (Date.now() - (log[userId] ?? 0) < RESEND_GAP_MS) return true;
  await c.from("settings").upsert({ key: THROTTLE_KEY, value: { ...log, [userId]: Date.now() } });
  return false;
}

export async function requestReset(_prev: ForgotState, form: FormData): Promise<ForgotState> {
  const raw = String(form.get("email") ?? "").slice(0, 200);
  const parsed = z.string().trim().toLowerCase().email().safeParse(raw);
  if (!parsed.success) return { sent: false, email: raw, error: "Please enter the email you sign in with." };
  const email = parsed.data;
  const done: ForgotState = { sent: true, email };

  const c = authClient();
  const { data, error } = await c.auth.admin.generateLink({ type: "recovery", email });
  const user = data?.user;
  const token = data?.properties?.hashed_token;
  if (error || !user || !token || !(await isAdminUser(user.id))) {
    if (error && !/not.*found|no user/i.test(error.message)) console.error("[admin] reset link", error.message);
    await slow();
    return done;
  }
  if (await tooSoon(user.id)) {
    await slow();
    return done;
  }

  const base = await origin();
  const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : undefined;
  const mail = passwordResetEmail({
    name,
    url: `${base}/admin/reset?t=${encodeURIComponent(token)}`,
    minutes: LINK_MINUTES,
    logoUrl: `${base}/brand/email-logo.png`,
  });
  const from = process.env.ALERTS_FROM || process.env.BOOKS_FROM;
  const ok = await sendMail({ to: user.email ?? email, from, ...mail });
  if (!ok) return { sent: false, email, error: "We couldn't send the email just now. Please try again in a few minutes." };
  return done;
}

type Recovery = { at: string; rt: string; uid: string; exp: number };

export async function resetPassword(_prev: ResetState, form: FormData): Promise<ResetState> {
  const parsed = z
    .object({
      t: z.string().min(10).max(200),
      next: z.string().min(10, "Use at least 10 characters").max(200),
      confirm: z.string().max(200),
      code: z.string().transform((s) => s.replace(/\s/g, "")).pipe(z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your app")),
    })
    .safeParse(Object.fromEntries(["t", "next", "confirm", "code"].map((k) => [k, String(form.get(k) ?? "")])));
  if (!parsed.success) {
    const errors = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
    if (errors.t) return { done: false, expired: true, error: "This reset link isn't complete. Request a new one." };
    return { done: false, error: "Some details need attention.", errors };
  }
  const { t, next, confirm, code } = parsed.data;
  if (next !== confirm) return { done: false, error: "The new passwords don't match.", errors: { confirm: "Doesn't match the new password" } };

  const jar = await cookies();
  const c = authClient();

  // a retry after a mistyped code reuses the recovery session from the first try
  const held = unsign<Recovery>(jar.get(RESET_COOKIE)?.value);
  let uid: string | undefined;
  if (held && !(await c.auth.setSession({ access_token: held.at, refresh_token: held.rt })).error) {
    uid = held.uid;
  } else {
    const { data, error } = await c.auth.verifyOtp({ token_hash: t, type: "recovery" });
    if (error || !data.session || !data.user) {
      await slow();
      return { done: false, expired: true, error: "This reset link has expired or has already been used." };
    }
    uid = data.user.id;
    const rec: Recovery = { at: data.session.access_token, rt: data.session.refresh_token, uid, exp: Date.now() + RESET_MINUTES * 60_000 };
    jar.set(RESET_COOKIE, sign(rec), cookieOptions(RESET_MINUTES * 60));
  }

  if (!(await isAdminUser(uid))) {
    await c.auth.signOut({ scope: "local" });
    jar.delete({ name: RESET_COOKIE, path: "/admin" });
    return { done: false, expired: true, error: "This reset link has expired or has already been used." };
  }

  const { data: factors } = await c.auth.mfa.listFactors();
  const factor = factors?.totp[0];
  if (factor) {
    const { error: codeError } = await c.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (codeError) {
      await slow();
      return { done: false, error: "That code didn't work. Codes change every 30 seconds, so try the current one.", errors: { code: "Code didn't work" } };
    }
  }

  const { error: updateError } = await c.auth.updateUser({ password: next });
  if (updateError) {
    console.error("[admin] password reset", updateError.message);
    return {
      done: false,
      error: /weak|pwned|leak/i.test(updateError.message)
        ? "That password is too easy to guess. Try a longer one."
        : /same|different/i.test(updateError.message)
          ? "That's your current password. Choose a new one."
          : "Couldn't save the new password. Please try again.",
      errors: { next: "Choose another password" },
    };
  }

  await c.auth.signOut({ scope: "global" });
  await signOutEverywhere(uid);
  jar.delete({ name: RESET_COOKIE, path: "/admin" });
  return { done: true };
}
