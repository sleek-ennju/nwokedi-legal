"use client";

import { toast } from "@/lib/toast";
import { useActionState, useEffect, useRef, useState } from "react";
import { changePassword } from "@/app/admin/actions/account";

/** Settings → Account: current password, the new one twice, and an authenticator code. */
export default function PasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(changePassword, null);
  const [show, setShow] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const err = (k: string) => (state && !state.ok ? state.errors?.[k] : undefined);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Password changed", { description: state.message });
      form.current?.reset();
    } else toast.error("Password not changed", { description: state.message });
  }, [state]);

  const type = show ? "text" : "password";
  return (
    <section className="a-card a-section" id="account">
      <h2>Account</h2>
      <p className="a-card__sub">
        Signed in as <strong>{email}</strong>. To change your password you&rsquo;ll need your current one and a code from your authenticator app.
      </p>
      <form ref={form} action={action} className="a-form a-pass">
        {/* lets a password manager save the new password against the right account */}
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
        <label className="a-field a-field--wide">
          <span className="a-field__label">Current password</span>
          <input className="a-input" name="current" type={type} autoComplete="current-password" required aria-invalid={!!err("current")} />
          {err("current") && <span className="a-msg a-msg--err">{err("current")}</span>}
        </label>
        <label className="a-field">
          <span className="a-field__label">
            New password
            <small>At least 10 characters. A short phrase is easiest to remember.</small>
          </span>
          <input className="a-input" name="next" type={type} autoComplete="new-password" minLength={10} required aria-invalid={!!err("next")} />
          {err("next") && <span className="a-msg a-msg--err">{err("next")}</span>}
        </label>
        <label className="a-field">
          <span className="a-field__label">
            New password again
            <small>&nbsp;</small>
          </span>
          <input className="a-input" name="confirm" type={type} autoComplete="new-password" required aria-invalid={!!err("confirm")} />
          {err("confirm") && <span className="a-msg a-msg--err">{err("confirm")}</span>}
        </label>
        <label className="a-check a-field--wide">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          Show passwords
        </label>
        <label className="a-field">
          <span className="a-field__label">Code from your authenticator app</span>
          <input
            className="a-input a-pass__code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            placeholder="123 456"
            required
            aria-invalid={!!err("code")}
          />
          {err("code") && <span className="a-msg a-msg--err">{err("code")}</span>}
        </label>
        <div className="a-field a-pass__go">
          <button className="a-btn" type="submit" disabled={pending}>
            {pending ? "Changing…" : "Change password"}
          </button>
        </div>
      </form>
    </section>
  );
}
