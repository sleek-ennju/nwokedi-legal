import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PracticeFilter from "@/components/articles/PracticeFilter";
import { getArticles, type Article } from "@/lib/articles/catalog";
import { serializeJsonLd } from "@/lib/jsonld";
import { site } from "@/lib/site";
import "../articles.css";

const author = site.principal.name ? `${site.principal.name} Esq.` : site.name;

export const metadata: Metadata = {
  title: "Articles",
  description: `Plain-English writing by ${author} on intellectual property, media and entertainment, corporate and commercial work, and property in Nigeria.`,
  alternates: { canonical: "/articles", types: { "application/rss+xml": "/articles/rss.xml" } },
  openGraph: { url: "/articles", title: `Articles · ${site.name}` },
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" }) : "";

function Meta({ a }: { a: Article }) {
  return (
    <p className="art-meta">
      <span>{a.practiceName}</span>
      <time dateTime={a.publish_at ?? undefined}>{fmt(a.publish_at)}</time>
      <span>{a.minutes} min read</span>
    </p>
  );
}

export default async function ArticlesPage() {
  const articles = await getArticles();
  const featured = articles.find((a) => a.featured) ?? articles[0];
  const rest = articles.filter((a) => a !== featured);
  const counts = new Map<string, { id: string; name: string; count: number }>();
  for (const a of rest) {
    const c = counts.get(a.practice) ?? { id: a.practice, name: a.practiceName, count: 0 };
    c.count++;
    counts.set(a.practice, c);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${site.url}/articles#blog`,
    name: `Articles · ${site.name}`,
    url: `${site.url}/articles`,
    publisher: { "@id": `${site.url}/#firm` },
    blogPost: articles.slice(0, 20).map((a) => ({ "@type": "BlogPosting", headline: a.title, url: `${site.url}/articles/${a.slug}`, datePublished: a.publish_at })),
  };

  return (
    <>
      <Nav theme="light" current="articles" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <main className="art-index">
        <header className="art-index__head">
          <h1>
            Clear answers on <em>what you own.</em>
          </h1>
          <p>
            Plain-English writing by {author} on intellectual property, media and entertainment, corporate and commercial work, and
            property: what the law says, and what it means for you.
          </p>
        </header>

        {!featured ? (
          <section className="art-empty">
            <h2>The first articles are being written.</h2>
            <p>In the meantime, the book is a good place to start, or bring your question straight to us.</p>
            <div className="art-empty__actions">
              <Link className="button button--ink" href="/books">
                Read the book
              </Link>
              <a className="art-link" href="/#consult">
                Request a consultation →
              </a>
            </div>
          </section>
        ) : (
          <>
            <Link href={`/articles/${featured.slug}`} className={`art-feature${featured.cover_url ? " art-feature--image" : ""}`}>
              <div className="art-feature__visual">
                {featured.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- cover from our media bucket
                  <img src={featured.cover_url} alt={featured.cover_alt ?? ""} />
                ) : (
                  <span className="art-feature__mark" aria-hidden="true">
                    {featured.practiceName}
                  </span>
                )}
              </div>
              <div className="art-feature__text">
                <Meta a={featured} />
                <h2>{featured.title}</h2>
                {featured.excerpt && <p>{featured.excerpt}</p>}
                <span className="art-link">Read the article →</span>
              </div>
            </Link>

            {rest.length > 0 && (
              <section className="art-list" aria-label="More articles">
                <PracticeFilter options={[...counts.values()]} targetId="art-list" />
                <ul id="art-list">
                  {rest.map((a) => (
                    <li key={a.slug} data-practice={a.practice}>
                      <Link href={`/articles/${a.slug}`} className="art-row">
                        <Meta a={a} />
                        <h3>{a.title}</h3>
                        {a.excerpt && <p>{a.excerpt}</p>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
