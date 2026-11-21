import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { site } from "@/lib/site";
import "../../books.css";

export const metadata: Metadata = { title: "Download link", robots: { index: false, follow: false } };

const COPY: Record<string, { title: string; body: string }> = {
  device: {
    title: "Open your download from your email.",
    body: "For your security, the instant download only works in the browser you paid from. Your download link is in your order email.",
  },
  unpaid: {
    title: "We're still waiting for your payment to clear.",
    body: "As soon as your bank confirms it, you can download your book. Bank transfers can take a minute or two.",
  },
  limit: {
    title: "This order has reached its download limit.",
    body: "To keep your copy secure, each order has a limited number of download links. Get in touch with your order reference and we'll help.",
  },
  file: {
    title: "We couldn't fetch your file just now.",
    body: "Please try again in a moment. If it keeps happening, get in touch with your order reference and we'll send it to you.",
  },
  link: {
    title: "This link has expired.",
    body: "Download links are time-limited, to protect the book from being shared around (any copy you already saved is yours to keep). Reply to your order email or get in touch with your order reference, and we'll send a fresh one.",
  },
};

/** Where expired, used-up, unknown or wrong-device download links land. Calm, and one step to a fix. */
export default function InvalidDownload({ searchParams }: PageProps<"/download/invalid">) {
  return (
    <>
      <Nav theme="light" />
      <main className="done">
        <div className="done__card">
          <Suspense fallback={<Message reason="link" />}>
            <Reason searchParams={searchParams} />
          </Suspense>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full load into the home page (WebGL boot) */}
            <a className="button button--ink" href="/#consult">
              <span className="seal-dot" />
              Contact {site.name}
            </a>
            <Link className="button button--ghost" href="/books">
              Back to the books
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

async function Reason({ searchParams }: { searchParams: PageProps<"/download/invalid">["searchParams"] }) {
  const r = (await searchParams).reason;
  return <Message reason={(Array.isArray(r) ? r[0] : r) ?? "link"} />;
}

function Message({ reason }: { reason: string }) {
  const c = COPY[reason] ?? COPY.link;
  return (
    <>
      <h1 className="done__title">{c.title}</h1>
      <p className="done__body">{c.body}</p>
    </>
  );
}
