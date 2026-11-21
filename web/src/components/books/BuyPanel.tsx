"use client";

import { toast } from "@/lib/toast";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { startCheckout, type CheckoutState } from "@/app/actions/checkout";
import { track } from "@/lib/analytics";
import type { Book, Currency } from "@/lib/books/types";
import SampleReader from "./SampleReader";
import "./checkout.css";

type Props = {
  book: Book;
  available: boolean;
};

const fmt = (n: number, c: Currency) =>
  new Intl.NumberFormat(c === "NGN" ? "en-NG" : "en-US", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CLOSE_MS = 280;

type Lenisish = { stop?: () => void; start?: () => void };
const lenis = () => (window as unknown as { __lenis?: Lenisish }).__lenis;

/**
 * Price, currency choice, the checkout sheet and the sample reader for one book.
 * Checkout: what you're buying (order card), what happens next (3 steps), two
 * fields, one button to Paystack. Side sheet on desktop; a bottom sheet with a
 * drag handle and a pinned pay bar on phones.
 */
export default function BuyPanel({ book, available }: Props) {
  const { slug, title, price: prices } = book;
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [state, action, pending] = useActionState<CheckoutState, FormData>(startCheckout, { status: "idle" });
  const sheet = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const [drag, setDrag] = useState(0);
  const dragStart = useRef<number | null>(null);
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const price = prices[currency] ?? prices.NGN;
  const label = available ? `Buy · ${fmt(price, currency)}` : "Coming soon";

  useEffect(() => track("book_view", { slug }), [slug]);

  const close = useCallback(() => {
    const d = sheet.current;
    if (!d?.open) return;
    setClosing(true);
    setTimeout(() => {
      d.close();
      setClosing(false);
      setDrag(0);
      lenis()?.start?.();
    }, CLOSE_MS);
  }, []);

  useEffect(() => {
    if (state.status === "redirect" && state.url) {
      // the sheet is a top-layer dialog; close it so the toast can be seen while Paystack loads
      sheet.current?.close();
      lenis()?.start?.();
      toast.info("Opening secure checkout…", { description: "You'll pay on Paystack's secure page, then come straight back." });
      window.location.assign(state.url);
    }
  }, [state]);

  // Esc animates out instead of vanishing
  useEffect(() => {
    const d = sheet.current;
    if (!d) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      close();
    };
    d.addEventListener("cancel", onCancel);
    return () => d.removeEventListener("cancel", onCancel);
  }, [close]);

  const openSheet = () => {
    if (!available) return;
    const d = sheet.current;
    d?.showModal();
    // desktop: ready to type; phones: no keyboard over the order card
    if (matchMedia("(min-width: 641px)").matches) d?.querySelector<HTMLInputElement>("#b-name")?.focus();
    else d?.focus();
    lenis()?.stop?.();
    track("checkout_start", { slug, currency });
  };

  const err = state.fieldErrors ?? {};
  const v = state.values ?? { name: "", email: "" };
  const emailOk = EMAIL.test(email.trim());
  const emailErr = err.email ?? (emailTouched && email && !emailOk ? "That email doesn't look complete yet." : undefined);

  // drag the phone sheet down to dismiss (only from the handle/header)
  const onDragStart = (e: React.PointerEvent) => {
    if (!matchMedia("(max-width: 640px)").matches) return;
    dragStart.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (dragStart.current === null) return;
    setDrag(Math.max(0, e.clientY - dragStart.current));
  };
  const onDragEnd = () => {
    if (dragStart.current === null) return;
    dragStart.current = null;
    if (drag > 110) close();
    else setDrag(0);
  };

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
        <SampleReader slug={slug} title={title} pages={book.sample} buyLabel={label} onBuy={openSheet} disabled={!available} />
      </div>
      <p className="buy__note">Instant delivery: a secure download link is emailed to you as soon as payment is confirmed.</p>

      <dialog
        className={`co${closing ? " is-closing" : ""}${drag ? " is-dragging" : ""}`}
        ref={sheet}
        data-lenis-prevent
        aria-labelledby="co-title"
        tabIndex={-1}
        style={drag ? ({ "--drag": `${drag}px` } as React.CSSProperties) : undefined}
        onClick={(e) => {
          // a click on the backdrop (outside the panel) closes
          const r = e.currentTarget.getBoundingClientRect();
          if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
        }}
      >
        <div className="co__grab" onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd} aria-hidden="true">
          <span />
        </div>

        <header className="co__head" onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}>
          <p className="co__kicker">
            <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden>
              <rect x="3" y="6.2" width="8" height="5.6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4.8 6.2V4.6a2.2 2.2 0 0 1 4.4 0v1.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            Secure checkout
          </p>
          <button type="button" className="co__close" aria-label="Close checkout" onClick={close}>
            <svg width="14" height="14" viewBox="0 0 18 18" aria-hidden>
              <path d="M4 4l10 10M14 4 4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="co__body">
          {/* what you're buying: one line */}
          <section className="co__summary" aria-label="Your order">
            <h2 id="co-title">{title}</h2>
            <strong>{fmt(price, currency)}</strong>
          </section>

          {/* what happens next */}
          <ol className="co__steps" aria-label="How it works">
            <li className="is-now">
              <span>1</span>Your details
            </li>
            <li>
              <span>2</span>Pay securely
            </li>
            <li>
              <span>3</span>In your inbox
            </li>
          </ol>

          <form id="co-form" action={action} className="co__form" noValidate onSubmit={() => track("checkout_submit", { slug, currency })}>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="currency" value={currency} />

            <div className={`co__field${err.name ? " is-invalid" : ""}`}>
              <label htmlFor="b-name">Full name</label>
              <input
                id="b-name"
                name="name"
                autoComplete="name"
                placeholder="As you'd like it on your receipt"
                defaultValue={v.name}
                aria-invalid={err.name ? true : undefined}
                aria-describedby={err.name ? "b-name-err" : undefined}
              />
              {err.name && (
                <p className="co__err" id="b-name-err">
                  {err.name}
                </p>
              )}
            </div>

            <div className={`co__field${emailErr ? " is-invalid" : ""}${emailOk ? " is-valid" : ""}`}>
              <label htmlFor="b-email">Email</label>
              <div className="co__input">
                <input
                  id="b-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Where we'll send your book"
                  defaultValue={v.email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  aria-invalid={emailErr ? true : undefined}
                  aria-describedby={emailErr ? "b-email-err" : undefined}
                />
                <svg className="co__tick" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M5.5 10.4l3 3 6-6.6" />
                </svg>
              </div>
              {emailErr && (
                <p className="co__err" id="b-email-err">
                  {emailErr}
                </p>
              )}
            </div>

            {state.status === "error" && state.message && !state.fieldErrors && (
              <p className="co__alert" role="alert">
                {state.message}
              </p>
            )}
          </form>
        </div>

        {/* pinned to the bottom on phones, always in thumb reach */}
        <footer className="co__pay">
          <button className="co__btn" type="submit" form="co-form" disabled={pending} aria-busy={pending}>
            {pending ? (
              <>
                <span className="co__spin" aria-hidden="true" />
                Connecting to Paystack…
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 14 14" aria-hidden>
                  <rect x="3" y="6.2" width="8" height="5.6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M4.8 6.2V4.6a2.2 2.2 0 0 1 4.4 0v1.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
                </svg>
                Pay {fmt(price, currency)}
              </>
            )}
          </button>
          <p className="co__trust">
            Secured by <b>Paystack</b>
          </p>
        </footer>
      </dialog>
    </div>
  );
}
