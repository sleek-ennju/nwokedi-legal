import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { site } from "@/lib/site";
import "../../books.css";

export const metadata: Metadata = { title: "Download link", robots: { index: false, follow: false } };

/** Where expired, used-up or unknown download links land. Calm, and one step to a fix. */
export default function InvalidDownload() {
  return (
    <>
      <Nav theme="light" />
      <main className="done">
        <div className="done__card">
          <p className="eyebrow eyebrow--ink">Download link</p>
          <h1 className="done__title">This link has expired.</h1>
          <p className="done__body">
            Download links last 72 hours and allow five downloads, to keep your copy secure. If you need a fresh one, reply
            to your order email or get in touch, include your order reference, and we&apos;ll send a new link.
          </p>
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
