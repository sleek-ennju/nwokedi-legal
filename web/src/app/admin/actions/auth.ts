"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  PENDING_COOKIE,
  PENDING_MINUTES,
  authClient,
  cookieOptions,
  endSession,
  isAdminUser,
  sign,
  startSession,
  unsign,
} from "@/lib/admin/session";

export type AuthState = {
  step: "password" | "enroll" | "code";
  error?: string;
  email?: string;
  /** enrolment only: QR (SVG data URL) and the same secret as text for manual entry */
  qr?: string;
  secret?: string;
};

type Pending = { at: string; rt: string; uid: string; email: string; exp: number };

const NO_MATCH = "That email and password don't match an admin account.";
const slow = () => new Promise((r) => setTimeout(r, 400 + Math.random() * 400));

/** One form, three steps: password → (first time) set up authenticator → 6-digit code. */
export async function authStep(prev: AuthState, form: FormData): Promise<AuthState> {
  if (form.get("intent") === "restart") {
    await endSession();
    return { step: "password" };
  }
  return prev.step === "password" ? password(form) : code(prev, form);
}

async function password(form: FormData): Promise<AuthState> {
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(1).max(200) })
    .safeParse({ email: form.get("email"), password: form.get("password") });
  const email = String(form.get("email") ?? "").slice(0, 200);
  if (!parsed.success) return { step: "password", email, error: "Please enter your email and password." };

  const c = authClient();
  const { data, error } = await c.auth.signInWithPassword(parsed.data);
  if (error || !data.session || !(await isAdminUser(data.user.id))) {
    await slow();
    return { step: "password", email, error: NO_MATCH };
  }

  const pending: Pending = {
    at: data.session.access_token,
    rt: data.session.refresh_token,
    uid: data.user.id,
    email: data.user.email ?? parsed.data.email,
    exp: Date.now() + PENDING_MINUTES * 60_000,
  };
  (await cookies()).set(PENDING_COOKIE, sign(pending), cookieOptions(PENDING_MINUTES * 60));

  const { data: factors } = await c.auth.mfa.listFactors();
  if (factors?.totp.length) return { step: "code", email: pending.email };

  // first sign-in: clear any half-finished set-up, then start a fresh one
  for (const f of factors?.all ?? []) {
    if (f.factor_type === "totp" && f.status === "unverified") await c.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data: enrol, error: enrolError } = await c.auth.mfa.enroll({
    factorType: "totp",
    issuer: "Nwokedi Legal",
    friendlyName: "Authenticator app",
  });
  if (enrolError || !enrol) {
    console.error("[admin] enroll", enrolError?.message);
    return { step: "password", email, error: "Couldn't start two-step set-up. Please try again." };
  }
  return { step: "enroll", email: pending.email, qr: enrol.totp.qr_code, secret: enrol.totp.secret };
}

async function code(prev: AuthState, form: FormData): Promise<AuthState> {
  const pending = unsign<Pending>((await cookies()).get(PENDING_COOKIE)?.value);
  if (!pending) return { step: "password", error: "Your sign-in timed out. Please start again." };

  const otp = String(form.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(otp)) return { ...prev, error: "Enter the 6-digit code from your authenticator app." };

  const c = authClient();
  const { error: sessionError } = await c.auth.setSession({ access_token: pending.at, refresh_token: pending.rt });
  if (sessionError) return { step: "password", error: "Your sign-in timed out. Please start again." };

  const { data: factors } = await c.auth.mfa.listFactors();
  const factor =
    factors?.totp[0] ?? factors?.all.filter((f) => f.factor_type === "totp" && f.status === "unverified").at(-1);
  if (!factor) return { step: "password", error: "Please start again." };

  const { error } = await c.auth.mfa.challengeAndVerify({ factorId: factor.id, code: otp });
  if (error) {
    await slow();
    return { ...prev, error: "That code didn't work. Codes change every 30 seconds — try the current one." };
  }
  const { data: aal } = await c.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2" || !(await isAdminUser(pending.uid))) {
    return { step: "password", error: NO_MATCH };
  }

  // our own signed session takes over; the Supabase session isn't needed any more
  await c.auth.signOut({ scope: "local" });
  await startSession(pending.uid, pending.email);
  redirect("/admin");
}

export async function signOut() {
  await endSession();
  redirect("/admin/login");
}
