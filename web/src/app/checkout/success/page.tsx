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

  let state: "paid" | "pending" | "failed" = "pending";
  let email = "";
  if (ref && dbConfigured()) {
    // fallback to the webhook: fulfil here too (idempotent, delivers exactly once)
    const h = await headers();
    const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
    const r = await fulfilOrder(ref, { origin, mock });
    if (r.state === "delivered" || r.state === "already-delivered") {
      state = "paid";
      email = r.order.email;
    } else if (r.state === "failed") state = "failed";
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
        <p className="eyebrow eyebrow--ink">Payment not completed</p>
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

  return (
    <div className="done__card">
      {state === "paid" && <TrackView event="payment_success" slug={slug} />}
      {state === "paid" && <ToastOnMount kind="success" title="Payment confirmed" description="Your download link is on its way to your inbox." />}
      {book && (
        <div className="done__book">
          <Book3D book={book} width={150} />
        </div>
      )}
      {mock && <span className="badge badge--muted">Test mode — no real payment was taken</span>}
      <p className="eyebrow eyebrow--ink">{state === "paid" ? "Payment confirmed" : "Almost there"}</p>
      <h1 className="done__title">{state === "paid" ? "Your book is on its way." : "We're confirming your payment."}</h1>
      <p className="done__body">
        {state === "paid"
          ? `A secure download link for ${book?.title ?? "your book"} is being sent to ${email ? maskEmail(email) : "your email"}. It arrives within a few minutes — check your spam folder if you don't see it.`
          : "This can take a moment with bank transfers. As soon as it clears, your download link is emailed to you automatically."}
      </p>
      {ref && <p className="done__ref">Reference: {ref}</p>}
      <Link className="button button--ghost" href="/books">
        Back to the books
      </Link>
    </div>
  );
}
