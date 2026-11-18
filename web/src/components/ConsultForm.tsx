"use client";

import { useActionState, useRef } from "react";
import { submitConsultation, type ConsultState } from "@/app/actions/consult";
import { practices } from "@/lib/site";
import Select from "./Select";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function ConsultForm() {
  const [state, action, pending] = useActionState<ConsultState, FormData>(submitConsultation, { status: "idle" });
  const startedAt = useRef<HTMLInputElement>(null);
  const turnstileLoaded = useRef(false);

  // first focus: stamp the start time (bot check) and load Turnstile — kept off the critical path
  const onFirstFocus = () => {
    if (startedAt.current && !startedAt.current.value) startedAt.current.value = String(Date.now());
    if (!SITE_KEY || turnstileLoaded.current) return;
    turnstileLoaded.current = true;
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true;
    document.head.appendChild(s);
  };

  if (state.status === "ok") {
    return (
      <div className="consult__done" role="status">
        <p className="eyebrow eyebrow--ink">Received</p>
        <h3>Thank you — your request is with us.</h3>
        <p>We&apos;ll reply to the email you gave us. If it&apos;s urgent, say so in a follow-up and we&apos;ll prioritise it.</p>
      </div>
    );
  }

  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const field = (name: keyof typeof err) =>
    err[name] ? { "aria-invalid": true, "aria-describedby": `${name}-err` } : {};

  return (
    <form className="consult__form" action={action} onFocus={onFirstFocus} noValidate>
      <input type="hidden" name="started_at" ref={startedAt} defaultValue="" />
      <div className="hp" aria-hidden="true">
        <label>
          Company website
          <input name="company_website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="field">
        <label htmlFor="c-name">Full name</label>
        <input id="c-name" name="name" defaultValue={v.name} autoComplete="name" required {...field("name")} />
        {err.name && <p className="field__err" id="name-err">{err.name}</p>}
      </div>
      <div className="field">
        <label htmlFor="c-email">Email</label>
        <input id="c-email" name="email" defaultValue={v.email} type="email" autoComplete="email" inputMode="email" required {...field("email")} />
        {err.email && <p className="field__err" id="email-err">{err.email}</p>}
      </div>
      <div className="field">
        <label htmlFor="c-phone">
          Phone <span className="field__opt">optional</span>
        </label>
        <input id="c-phone" name="phone" defaultValue={v.phone} type="tel" autoComplete="tel" inputMode="tel" {...field("phone")} />
        {err.phone && <p className="field__err" id="phone-err">{err.phone}</p>}
      </div>
      <div className="field">
        <Select
          key={v.practice ?? "none"}
          id="c-practice"
          name="practice"
          label="Area"
          defaultValue={v.practice ?? ""}
          invalid={Boolean(err.practice)}
          describedBy={err.practice ? "practice-err" : undefined}
          options={[
            ...practices.map((p) => ({ value: p.id, label: p.name })),
            { value: "not-sure", label: "Not sure yet", hint: "We'll point you the right way" },
          ]}
        />
        {err.practice && <p className="field__err" id="practice-err">{err.practice}</p>}
      </div>
      <div className="field field--wide">
        <label htmlFor="c-message">What do you need help with?</label>
        <textarea id="c-message" name="message" defaultValue={v.message} rows={5} required {...field("message")} />
        {err.message && <p className="field__err" id="message-err">{err.message}</p>}
      </div>

      {SITE_KEY && <div className="cf-turnstile field--wide" data-sitekey={SITE_KEY} data-theme="light" />}

      <div className="consult__submit field--wide">
        <button className="button button--ink" type="submit" disabled={pending}>
          <span className="seal-dot" />
          {pending ? "Sending…" : "Request a consultation"}
        </button>
        <p className="consult__note">
          Sending this form doesn&apos;t create a lawyer–client relationship. Please don&apos;t include confidential details yet.
        </p>
      </div>
      {state.status === "error" && state.message && (
        <p className="consult__error field--wide" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
