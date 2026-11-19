import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Book3D from "@/components/books/Book3D";
import BookTurn from "@/components/books/BookTurn";
import BuyPanel from "@/components/books/BuyPanel";
import { getBook, getBooks } from "@/lib/books/catalog";
import { serializeJsonLd } from "@/lib/jsonld";
import { site } from "@/lib/site";
import "../../books.css";

export async function generateStaticParams() {
  return (await getBooks()).map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: PageProps<"/books/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBook(slug);
  if (!book) return {};
  const description = `${book.subtitle ? `${book.subtitle}. ` : ""}${book.hook}`;
  return {
    title: book.title,
    description,
    alternates: { canonical: `/books/${slug}` },
    openGraph: { type: "book", url: `/books/${slug}`, title: `${book.title} · ${site.name}`, description },
  };
}

/** Shell renders instantly (Next 16 "instant navigation"); the book itself streams in under Suspense. */
export default function BookPage({ params }: PageProps<"/books/[slug]">) {
  return (
    <>
      <Nav theme="light" current="books" />
      <Suspense fallback={<main className="title-page" aria-busy="true" />}>
        <BookContent params={params} />
      </Suspense>
      <Footer />
    </>
  );
}

async function BookContent({ params }: { params: PageProps<"/books/[slug]">["params"] }) {
  const { slug } = await params;
  const book = await getBook(slug);
  if (!book) notFound();
  const available = book.status === "published";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Book",
        "@id": `${site.url}/books/${slug}#book`,
        name: book.title,
        alternativeHeadline: book.subtitle,
        author: site.principal.name ? { "@id": `${site.url}/#principal` } : { "@type": "Organization", name: site.name },
        publisher: { "@id": `${site.url}/#firm` },
        bookFormat: "https://schema.org/EBook",
        numberOfPages: book.pages,
        inLanguage: "en",
        description: book.synopsis.join(" "),
        offers: available
          ? Object.entries(book.price).map(([currency, price]) => ({
              "@type": "Offer",
              price,
              priceCurrency: currency,
              availability: "https://schema.org/InStock",
              url: `${site.url}/books/${slug}`,
            }))
          : undefined,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Books", item: `${site.url}/books` },
          { "@type": "ListItem", position: 2, name: book.title, item: `${site.url}/books/${slug}` },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />

      <main className="title-page">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/books">Books</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">{book.title}</span>
        </nav>

        <div className="title-page__grid">
          <div className="title-page__stage">
            <BookTurn>
              <Book3D book={book} width={300} priority />
            </BookTurn>
            <span className="title-page__shadow" aria-hidden />
          </div>

          <div className="title-page__info">
            <div className="shelf__badges">
              {!available && <span className="badge">Coming soon</span>}
              {book.notice && <span className="badge badge--muted">{book.notice}</span>}
            </div>
            <p className="eyebrow eyebrow--ink">
              {book.format} · {book.pages} pages · {book.year}
            </p>
            <h1 className="title-page__title">{book.title}</h1>
            {book.subtitle && <p className="title-page__subtitle">{book.subtitle}</p>}
            <p className="title-page__author">by {book.author}</p>

            <BuyPanel slug={book.slug} title={book.title} prices={book.price} available={available} sample={book.sample} />

            <div className="title-page__body">
              {book.synopsis.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <div className="title-page__lists">
              <div>
                <p className="foot__head foot__head--ink">Inside</p>
                <ol className="contents">
                  {book.contents.map((c, i) => (
                    <li key={c}>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      {c}
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="foot__head foot__head--ink">Written for</p>
                <ul className="for-whom">
                  {book.forWhom.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
