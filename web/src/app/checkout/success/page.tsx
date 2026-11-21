import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Book3D from "@/components/books/Book3D";
import TrackView from "@/components/books/TrackView";
import ToastOnMount from "@/components/ToastOnMount";
import { getBook } from "@/lib/books/catalog";
import { headers } from "next/headers";
import { paystackConfigured, verify } from "@/lib/payments/paystack";
import { fulfilOrder } from "@/lib/fulfil";
import { dbConfigured } from "@/lib/db/supabase";
import { getOrder } from "@/lib/db/orders";
import { hasBuyerPass } from "@/lib/buyer-pass";
import { emailConfigured } from "@/lib/email/send";
import { getSettings } from "@/lib/settings";
import PendingRefresh from "@/components/books/PendingRefresh";
import "../../books.css";

export const metadata: Metadata = {
  title: "Thank you",
  robots: { index: false, follow: false },
};

/** The page Paystack returns the buyer to. The reference is runtime data, so it renders inside Suspense. */
export default function SuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  return (
    <>
      <Nav theme="light" />
      <main className="done">
        <Suspense fallback={<p className="done__checking">Confirming your payment…</p>}>
          <Result searchParams={searchParams} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

const maskEmail = (e: string) => e.replace(/^(.)(.*)(.@.*)$/, (_, a, m, b) => a + "•".repeat(Math.min(m.length, 6)) + b);

async function Result({ searchParams }: { searchParams: PageProps<"/checkout/success">["searchParams"] }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const ref = one(sp.ref);
  const slug = one(sp.book);
  const mock = one(sp.mock) === "1" && process.env.NODE_ENV !== "production";
  const book = slug ? await getBook(slug) : undefined;

  // "paid" comes from the order itself, never from whether the email went out
  let state: "paid" | "pending" | "failed" = "pending";
  let email = "";
  let emailed = false;
  if (ref && dbConfigured()) {
    // fallback to the webhook: fulfil here too (idempotent, delivers exactly once)
    const h = await headers();
    const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
    const r = await fulfilOrder(ref, { origin, mock });
    const order = ("order" in r ? r.order : null) ?? (await getOrder(ref));
    if (r.state === "failed") state = "failed";
    else if (order?.status === "paid") {
      state = "paid";
      email = order.email;
      emailed = r.state === "delivered" || r.state === "already-delivered";
    }
  } else if (mock) state = "paid";
  else if (ref && paystackConfigured()) {
    const v = await verify(ref);
    if (v?.status === "success") {
      state = "paid";
      email = v.email;
    } else if (v && ["failed", "abandoned", "reversed"].includes(v.status)) state = "failed";
  }

  if (state === "failed") {
    return (
      <div className="done__card">
        <ToastOnMount kind="error" title="Payment not completed" description="Nothing was charged. You can try again whenever you're ready." />
        <h1 className="done__title">Nothing was charged.</h1>
        <p className="done__body">The payment didn&apos;t go through. You can try again whenever you&apos;re ready.</p>
        {book && (
          <Link className="button button--ink" href={`/books/${book.slug}`}>
            <span className="seal-dot" />
            Back to {book.title}
          </Link>
        )}
      </div>
    );
  }

  if (state === "pending") {
    return (
      <div className="done__card">
        {book && (
          <div className="done__book">
            <Book3D book={book} width={150} />
          </div>
        )}
        <h1 className="done__title">Waiting for your bank to confirm.</h1>
        <p className="done__body">
          This usually takes a few seconds, a little longer for bank transfers. This page checks again on its own, so you can stay
          right here.
        </p>
        <PendingRefresh reference={ref} />
      </div>
    );
  }

  // paid: hand over the book right here (only in the browser that bought it)
  const canDownload = Boolean(ref && !mock && (await hasBuyerPass(ref)));
  const { downloads } = await getSettings();
  const to = email ? maskEmail(email) : "your email";
  const emailLine = emailed
    ? `We've also emailed a download link to ${to}. Keep it for later.`
    : emailConfigured()
      ? `A download link is also on its way to ${to}.`
      : null;

  return (
    <div className="done__card">
      <TrackView event="payment_success" slug={slug} />
      <ToastOnMount kind="success" title="Payment confirmed" description={canDownload ? "Your book is ready to download." : `Your download link is on its way to ${to}.`} />
      {book && (
        <div className="done__book">
          <Book3D book={book} width={150} />
        </div>
      )}
      {mock && <span className="badge badge--muted">Test mode — no real payment was taken</span>}
      <h1 className="done__title">Payment confirmed.</h1>
      <p className="done__body">
        {canDownload ? `Thank you. Your copy of ${book?.title ?? "the book"} is ready.` : `Thank you. Your download link for ${book?.title ?? "the book"} is on its way to ${to}.`}
        {canDownload && emailLine ? ` ${emailLine}` : ""}
      </p>
      {canDownload && (
        <>
          <a className="button button--ink done__download" href={`/checkout/download/${encodeURIComponent(ref)}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 2.5v8M4.5 7.5 8 11l3.5-3.5M3 13.5h10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download your book
          </a>
          <p className="done__fine">
            This download link works for {downloads.hours} hours (up to {downloads.uses} downloads). Once saved, the {book?.format ?? "PDF"} is yours to keep.
          </p>
        </>
      )}
      {ref && <p className="done__ref">Reference: {ref}</p>}
      <Link className="button button--ghost" href="/books">
        Back to the books
      </Link>
    </div>
  );
}
