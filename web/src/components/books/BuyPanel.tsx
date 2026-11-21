"use client";

import { toast } from "@/lib/toast";
import { useActionState, useEffect, useRef, useState } from "react";
import { startCheckout, type CheckoutState } from "@/app/actions/checkout";
import { track } from "@/lib/analytics";
import type { Currency } from "@/lib/books/types";
import SampleReader from "./SampleReader";
import type { SamplePage } from "@/lib/books/types";

type Props = {
  slug: string;
  title: string;
  prices: { NGN: number; USD?: number };
  available: boolean;
  sample: SamplePage[];
};

const fmt = (n: number, c: Currency) =>
  new Intl.NumberFormat(c === "NGN" ? "en-NG" : "en-US", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n);

/**
 * Price, currency choice, the purchase sheet and the sample reader for one book.
 * Checkout is a short sheet: name + email (where the book is delivered), then Paystack.
 */
export default function BuyPanel({ slug, title, prices, available, sample }: Props) {
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [state, action, pending] = useActionState<CheckoutState, FormData>(startCheckout, { status: "idle" });
  const sheet = useRef<HTMLDialogElement>(null);
  const price = prices[currency] ?? prices.NGN;
  const label = available ? `Buy · ${fmt(price, currency)}` : "Coming soon";

  useEffect(() => track("book_view", { slug }), [slug]);
  useEffect(() => {
    if (state.status === "redirect" && state.url) {
      // the sheet is a top-layer dialog; close it so the toast can be seen while Paystack loads
      sheet.current?.close();
      toast.info("Opening secure checkout…", { description: "You'll pay on Paystack's secure page, then come straight back." });
      window.location.assign(state.url);
    }
  }, [state]);

  const openSheet = () => {
    if (!available) return;
    sheet.current?.showModal();
    track("checkout_start", { slug, currency });
  };

  const err = state.fieldErrors ?? {};
  const v = state.values ?? { name: "", email: "" };

  return (
    <div className="buy">
      <div className="buy__price-row">
        <p className="buy__price" aria-live="polite">
          {fmt(price, currency)}
        </p>
        {prices.USD && (
          <div className="seg" role="radiogroup" aria-label="Currency">
            {(["NGN", "USD"] as Currency[]).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={currency === c}
                className={`seg__opt${currency === c ? " is-on" : ""}`}
                onClick={() => setCurrency(c)}
              >
                {c === "NGN" ? "₦ NGN" : "$ USD"}
              </button>
            ))}
            <span className="seg__thumb" data-pos={currency === "NGN" ? 0 : 1} aria-hidden />
          </div>
        )}
      </div>

      <div className="buy__actions">
        <button type="button" className="button button--ink" onClick={openSheet} disabled={!available}>
          <span className="seal-dot" />
          {label}
        </button>
        <SampleReader slug={slug} title={title} pages={sample} buyLabel={label} onBuy={openSheet} disabled={!available} />
      </div>
      <p className="buy__note">
        Instant delivery: a secure download link is emailed to you as soon as payment is confirmed.
      </p>

      <dialog className="sheet" ref={sheet} data-lenis-prevent aria-labelledby="sheet-title">
        <form method="dialog" className="sheet__close-form">
          <button className="sheet__close" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
              <path d="M4 4l10 10M14 4 4 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </form>
        <p className="eyebrow eyebrow--ink">Checkout</p>
        <h2 className="sheet__title" id="sheet-title">
          {title}
        </h2>
        <p className="sheet__total">
          {fmt(price, currency)} <span>· digital edition</span>
        </p>

        <form action={action} className="sheet__form" noValidate onSubmit={() => track("checkout_submit", { slug, currency })}>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="currency" value={currency} />
          <div className="field">
            <label htmlFor="b-name">Full name</label>
            <input
              id="b-name"
              name="name"
              autoComplete="name"
              defaultValue={v.name}
              aria-invalid={err.name ? true : undefined}
              aria-describedby={err.name ? "b-name-err" : undefined}
            />
            {err.name && (
              <p className="field__err" id="b-name-err">
                {err.name}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="b-email">Email — your book is delivered here</label>
            <input
              id="b-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              defaultValue={v.email}
              aria-invalid={err.email ? true : undefined}
              aria-describedby={err.email ? "b-email-err" : undefined}
            />
            {err.email && (
              <p className="field__err" id="b-email-err">
                {err.email}
              </p>
            )}
          </div>
          <button className="button button--ink sheet__pay" type="submit" disabled={pending}>
            <span className="seal-dot" />
            {pending ? "Starting secure checkout…" : `Pay ${fmt(price, currency)}`}
          </button>
          {state.status === "error" && state.message && !state.fieldErrors && (
            <p className="consult__error" role="alert">
              {state.message}
            </p>
          )}
          <p className="sheet__secure">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <rect x="3" y="6.2" width="8" height="5.6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.1" />
              <path d="M4.8 6.2V4.6a2.2 2.2 0 0 1 4.4 0v1.6" fill="none" stroke="currentColor" strokeWidth="1.1" />
            </svg>
            Secure payment by Paystack — card, bank transfer or USSD. We never see your card details.
          </p>
        </form>
      </dialog>
    </div>
  );
}
