"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestReset, type ForgotState } from "@/app/admin/actions/reset";

export default function ForgotForm() {
  const [state, action, pending] = useActionState(requestReset, { sent: false } as ForgotState);

  if (state.sent) {
    return (
      <>
        <h1>Check your email</h1>
        <p className="a-login__lede">
          If <strong>{state.email}</strong> is a dashboard account, a link to choose a new password is on its way. It works once, for an hour.
        </p>
        <p className="a-login__note">Nothing after a few minutes? Check spam, or try again in two minutes.</p>
        <Link className="a-btn a-btn--ghost" href="/admin/login">
          Back to sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <h1>Forgot your password?</h1>
      <p className="a-login__lede">Enter the email you sign in with and we&rsquo;ll send you a link to choose a new one.</p>
      <form action={action} noValidate>
        {state.error && (
          <p className="a-error" role="alert">
            {state.error}
          </p>
        )}
        <label className="a-field">
          Email
          <input className="a-input" name="email" type="email" autoComplete="username" required defaultValue={state.email} autoFocus />
        </label>
        <button className="a-btn" type="submit" disabled={pending}>
          {pending ? "Sending…" : "Email me a reset link"}
        </button>
      </form>
      <p className="a-restart">
        <Link href="/admin/login">Back to sign in</Link>
      </p>
    </>
  );
}
