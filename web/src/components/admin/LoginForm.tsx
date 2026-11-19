"use client";

import { useActionState } from "react";
import { authStep, type AuthState } from "@/app/admin/actions/auth";

export default function LoginForm() {
  const [state, action, pending] = useActionState(authStep, { step: "password" } as AuthState);

  return (
    <>
      {state.step === "password" && (
        <>
          <h1>Sign in</h1>
          <p className="a-login__lede">The dashboard for books, orders and enquiries.</p>
        </>
      )}
      {state.step === "enroll" && (
        <>
          <h1>Protect your account</h1>
          <p className="a-login__lede">One-time set-up. After this, you&rsquo;ll enter a 6-digit code each time you sign in.</p>
          <ol className="a-steps">
            <li>Open an authenticator app (Google Authenticator, Microsoft Authenticator or 1Password).</li>
            <li>Scan this code, or type the key below.</li>
            <li>Enter the 6-digit code it shows.</li>
          </ol>
          <div className="a-qr">
            {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data URL from Supabase */}
            <img src={state.qr} alt="QR code to add Nwokedi Legal to your authenticator app" />
            <code>{state.secret}</code>
          </div>
        </>
      )}
      {state.step === "code" && (
        <>
          <h1>Enter your code</h1>
          <p className="a-login__lede">Open your authenticator app and enter the 6-digit code for Nwokedi Legal.</p>
        </>
      )}

      <form action={action} noValidate>
        {state.error && (
          <p className="a-error" role="alert">
            {state.error}
          </p>
        )}
        {state.step === "password" ? (
          <>
            <label className="a-field">
              Email
              <input className="a-input" name="email" type="email" autoComplete="username" required defaultValue={state.email} autoFocus />
            </label>
            <label className="a-field">
              Password
              <input className="a-input" name="password" type="password" autoComplete="current-password" required />
            </label>
          </>
        ) : (
          <label className="a-field">
            <span className="sr-only">6-digit code</span>
            <input
              className="a-input a-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={7}
              placeholder="000000"
              required
              autoFocus
              key={state.step + (state.error ?? "")}
            />
          </label>
        )}
        <button className="a-btn" type="submit" disabled={pending}>
          {pending ? "Checking…" : state.step === "password" ? "Continue" : "Verify and sign in"}
        </button>
      </form>

      {state.step !== "password" && (
        <form action={action} className="a-restart">
          <input type="hidden" name="intent" value="restart" />
          <button type="submit">Use a different account</button>
        </form>
      )}
    </>
  );
}
