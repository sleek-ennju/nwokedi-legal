import type { Metadata } from "next";
import Link from "next/link";
import Book3D from "@/components/books/Book3D";
import ImportStarter from "@/components/admin/ImportStarter";
import { listBooksAdmin } from "@/lib/admin/books";
import { money, moneyPair } from "@/lib/admin/format";
import "../../../books.css";

export const metadata: Metadata = { title: "Books" };

const STATUS: Record<string, string> = { published: "On sale", "coming-soon": "Coming soon", draft: "Draft" };

export default async function BooksPage() {
  const { books, starter } = await listBooksAdmin();

  return (
    <>
      <header className="a-head">
        <div>
          <h1>Books</h1>
          <p>Add a book, change its price or sample, or upload a new edition. Changes go live as soon as you save.</p>
        </div>
        {!starter && (
          <Link className="a-btn" href="/admin/books/new">
            New book
          </Link>
        )}
      </header>

      {starter && (
        <section className="a-card a-callout">
          <h2>One step before you can edit</h2>
          <p className="a-card__sub">
            The book on the site is still read from the website&rsquo;s files. Move it into the dashboard once, and from then on you can edit everything here.
            Nothing changes on the site.
          </p>
          <ImportStarter />
        </section>
      )}

      <div className="a-books">
        {books.map(({ book, file, sold, revenue }) => (
          <article key={book.slug} className="a-card a-bookcard">
            <div className="a-bookcard__cover">
              <Book3D book={book} width={96} />
            </div>
            <div className="a-bookcard__body">
              <span className={`a-pill a-pill--${book.status}`}>{STATUS[book.status]}</span>
              <h2>{book.title}</h2>
              <p className="a-small a-mute">
                {money(book.price.NGN, "NGN")}
                {book.price.USD ? ` · ${money(book.price.USD, "USD")}` : ""} · {book.sample.length} sample pages
              </p>
              <p className="a-small">
                {sold ? `${sold} sold · ${moneyPair(revenue)}` : <span className="a-mute">No sales yet</span>}
              </p>
              {!file && <p className="a-msg a-msg--err">No book file uploaded</p>}
              {!starter && (
                <Link className="a-btn a-btn--ghost a-btn--sm" href={`/admin/books/${book.slug}`}>
                  Edit
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

/** Admin screens read the session and live data on every request, so they block rather than prerender. */
export const instant = false;
