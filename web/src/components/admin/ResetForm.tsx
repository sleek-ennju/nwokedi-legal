"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { resetPassword } from "@/app/admin/actions/reset";

export default function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, null);
  const [show, setShow] = useState(false);
  const err = (k: string) => state?.errors?.[k];

  if (state?.done) {
    return (
      <>
        <h1>Password changed</h1>
        <p className="a-login__lede">Your new password is saved, and every device that was signed in has been signed out. Sign in with the new password.</p>
        <Link className="a-btn" href="/admin/login">
          Sign in
        </Link>
      </>
    );
  }

  if (!token || state?.expired) {
    return (
      <>
        <h1>Link expired</h1>
        <p className="a-login__lede">{state?.error ?? "This reset link isn't complete."} Reset links work once, for an hour.</p>
        <Link className="a-btn" href="/admin/forgot">
          Send a new link
        </Link>
      </>
    );
  }

  const type = show ? "text" : "password";
  return (
    <>
      <h1>Choose a new password</h1>
      <p className="a-login__lede">You&rsquo;ll also need the 6-digit code from your authenticator app.</p>
      <form action={action} noValidate>
        {state?.error && (
          <p className="a-error" role="alert">
            {state.error}
          </p>
        )}
        <input type="hidden" name="t" value={token} />
        <label className="a-field">
          New password
          <input className="a-input" name="next" type={type} autoComplete="new-password" minLength={10} required autoFocus aria-invalid={!!err("next")} />
          <span className="a-login__hint">{err("next") ?? "At least 10 characters. A short phrase is easiest to remember."}</span>
        </label>
        <label className="a-field">
          New password again
          <input className="a-input" name="confirm" type={type} autoComplete="new-password" required aria-invalid={!!err("confirm")} />
          {err("confirm") && <span className="a-login__hint a-login__hint--err">{err("confirm")}</span>}
        </label>
        <label className="a-check a-login__check">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          Show passwords
        </label>
        <label className="a-field">
          Code from your authenticator app
          <input
            className="a-input a-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            placeholder="000000"
            required
            aria-invalid={!!err("code")}
          />
        </label>
        <button className="a-btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save new password"}
        </button>
      </form>
      <p className="a-restart a-login__note">Lost your authenticator app? Ask your developer to reset your sign-in.</p>
    </>
  );
}
