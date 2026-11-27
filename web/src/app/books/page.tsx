import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Book3D from "@/components/books/Book3D";
import TrackView from "@/components/books/TrackView";
import { formatPrice, getBooks } from "@/lib/books/catalog";
import { serializeJsonLd } from "@/lib/jsonld";
import { site } from "@/lib/site";
import "../books.css";

export const metadata: Metadata = {
  title: "Books",
  description: `Practical guides on intellectual property, creative deals and property by ${site.principal.name || site.name}. Read a sample, buy, and receive your copy by email instantly.`,
  alternates: { canonical: "/books" },
  openGraph: { url: "/books", title: `Books · ${site.name}` },
};

export default async function BooksPage() {
  const books = await getBooks();
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Books by ${site.principal.name || site.name}`,
    itemListElement: books.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${site.url}/books/${b.slug}`,
      name: b.title,
    })),
  };

  return (
    <>
      <Nav theme="light" current="books" />
      <TrackView event="store_view" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemList) }} />

      <main className="store">
        <header className="store__head">
          <p className="eyebrow eyebrow--ink">Books</p>
          <h1 className="store__title">
            Writing from <em>the practice.</em>
          </h1>
          <p className="store__lede">
            Practical guides on intellectual property, creative deals and property — written to be used, not shelved. Read
            a sample, then download your copy the moment you&rsquo;ve paid.
          </p>
        </header>

        <section className="shelf" aria-label="All books">
          <ul className="shelf__row">
            {books.map((b) => (
              <li className="shelf__item" key={b.slug}>
                <Link href={`/books/${b.slug}`} className="shelf__link">
                  <div className="shelf__stage">
                    <Book3D book={b} width={210} />
                    <span className="shelf__shadow" aria-hidden />
                  </div>
                  <div className="shelf__meta">
                    <div className="shelf__badges">
                      {b.status === "coming-soon" && <span className="badge">Coming soon</span>}
                      {b.notice && <span className="badge badge--muted">{b.notice}</span>}
                    </div>
                    <h2 className="shelf__name">{b.title}</h2>
                    <p className="shelf__hook">{b.hook}</p>
                    <p className="shelf__price">
                      {formatPrice(b.price.NGN, "NGN")}
                      {b.price.USD ? <span> · {formatPrice(b.price.USD, "USD")}</span> : null}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
            <li className="shelf__item shelf__item--soon" aria-label="More titles in preparation">
              <div className="shelf__stage shelf__stage--soon">
                <span className="soon__spine" />
                <span className="soon__spine" />
                <span className="soon__spine" />
              </div>
              <div className="shelf__meta">
                <h2 className="shelf__name">More in preparation.</h2>
                <p className="shelf__hook">New guides from the practice are on the way. Follow along — or ask about a topic you&apos;d like covered.</p>
              </div>
            </li>
          </ul>
        </section>

        <section className="store__promise" aria-label="How buying works">
          {[
            ["Read first", "Every book opens with a free sample — the real pages, not a summary."],
            ["Pay securely", "Card, bank transfer or USSD through Paystack. Naira or dollars."],
            ["Yours instantly", "Download it as soon as payment clears, and keep the copy of the link we email you."],
          ].map(([t, d], i) => (
            <div className="promise" key={t}>
              <span className="promise__n">0{i + 1}</span>
              <p className="promise__t">{t}</p>
              <p className="promise__d">{d}</p>
            </div>
          ))}
        </section>
      </main>

      <Footer />
    </>
  );
}
