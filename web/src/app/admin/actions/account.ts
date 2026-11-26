"use server";

import { z } from "zod";
import { authClient, requireAdmin, signOutEverywhere, startSession } from "@/lib/admin/session";

export type PasswordState = { ok: boolean; message: string; errors?: Record<string, string> } | null;

const slow = () => new Promise((r) => setTimeout(r, 400 + Math.random() * 400));

/**
 * Change the signed-in admin's password. Needs the current password AND a
 * fresh authenticator code, so an unlocked laptop alone can't take over the
 * account. The change is made on a session that has just passed both checks.
 * Afterwards every other device is signed out; this one gets a fresh session.
 */
export async function changePassword(_prev: PasswordState, form: FormData): Promise<PasswordState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      current: z.string().min(1, "Enter your current password").max(200),
      next: z.string().min(10, "Use at least 10 characters").max(200),
      confirm: z.string().max(200),
      code: z.string().transform((s) => s.replace(/\s/g, "")).pipe(z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your app")),
    })
    .safeParse(Object.fromEntries(["current", "next", "confirm", "code"].map((k) => [k, String(form.get(k) ?? "")])));
  if (!parsed.success) {
    const errors = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
    return { ok: false, message: "Some details need attention.", errors };
  }
  const { current, next, confirm, code } = parsed.data;
  if (next !== confirm) return { ok: false, message: "The new passwords don't match.", errors: { confirm: "Doesn't match the new password" } };
  if (next === current) return { ok: false, message: "Choose a password you haven't used here.", errors: { next: "Same as your current password" } };

  const c = authClient();
  const { data, error } = await c.auth.signInWithPassword({ email: admin.email, password: current });
  if (error || !data.session || data.user.id !== admin.id) {
    await slow();
    return { ok: false, message: "Your current password isn't right.", errors: { current: "Not your current password" } };
  }
  try {
    const { data: factors } = await c.auth.mfa.listFactors();
    const factor = factors?.totp[0];
    if (!factor) return { ok: false, message: "Your authenticator isn't set up. Sign out and back in to set it up first." };
    const { error: codeError } = await c.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (codeError) {
      await slow();
      return { ok: false, message: "That code didn't work. Codes change every 30 seconds, so try the current one.", errors: { code: "Code didn't work" } };
    }
    const { error: updateError } = await c.auth.updateUser({ password: next });
    if (updateError) {
      console.error("[admin] password change", updateError.message);
      return { ok: false, message: /weak|pwned|leak/i.test(updateError.message) ? "That password is too easy to guess. Try a longer one." : "Couldn't change the password. Please try again." };
    }
    // end every session: Supabase's (other half-finished sign-ins) and ours (other devices)
    await c.auth.signOut({ scope: "global" });
    const revoked = await signOutEverywhere(admin.id);
    await startSession(admin.id, admin.email, admin.name);
    return {
      ok: true,
      message: revoked
        ? "Any other device signed in to the dashboard has been signed out. Use your new password from now on."
        : "Use your new password from now on.",
    };
  } finally {
    await c.auth.signOut({ scope: "local" });
  }
}
