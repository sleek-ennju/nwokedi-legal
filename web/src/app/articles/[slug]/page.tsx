import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ShareLinks from "@/components/articles/ShareLinks";
import portrait from "@/assets/photos/gaze-portrait.jpg";
import { getArticle, getArticles } from "@/lib/articles/catalog";
import { Markdown, headings } from "@/lib/articles/markdown";
import { getBooks } from "@/lib/books/catalog";
import { serializeJsonLd } from "@/lib/jsonld";
import { site } from "@/lib/site";
import "../../articles.css";

const author = site.principal.name ? `${site.principal.name} Esq.` : site.name;

export async function generateStaticParams() {
  const all = await getArticles();
  // at least one param so the route prerenders; unknown slugs render on demand
  return all.length ? all.map((a) => ({ slug: a.slug })) : [{ slug: "_" }];
}

export async function generateMetadata({ params }: PageProps<"/articles/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) return { title: "Article not found", robots: { index: false } };
  return {
    title: a.title,
    description: a.description,
    alternates: { canonical: `/articles/${a.slug}` },
    authors: [{ name: author }],
    openGraph: {
      type: "article",
      url: `/articles/${a.slug}`,
      title: a.title,
      description: a.description,
      publishedTime: a.publish_at ?? undefined,
      modifiedTime: a.updated_at,
      authors: [author],
      ...(a.cover_url ? { images: [{ url: a.cover_url, alt: a.cover_alt ?? "" }] } : {}),
    },
    twitter: { card: "summary_large_image", title: a.title, description: a.description },
  };
}

/** The shell renders instantly; the article streams in under Suspense (Next 16 instant navigation). */
export default function ArticlePage({ params }: PageProps<"/articles/[slug]">) {
  return (
    <>
      <Nav theme="light" current="articles" />
      <div className="art-progress" aria-hidden="true" />
      <Suspense fallback={<main className="art" aria-busy="true" />}>
        <ArticleContent params={params} />
      </Suspense>
      <Footer />
    </>
  );
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" }) : "";

async function ArticleContent({ params }: { params: PageProps<"/articles/[slug]">["params"] }) {
  const { slug } = await params;
  const [a, all, books] = await Promise.all([getArticle(slug), getArticles(), getBooks()]);
  if (!a) notFound();

  const toc = headings(a.body).filter((h) => h.level === 2);
  const related = [...all.filter((x) => x.slug !== a.slug && x.practice === a.practice), ...all.filter((x) => x.slug !== a.slug && x.practice !== a.practice)].slice(0, 3);
  const book = books.find((b) => b.status === "published") ?? books[0];
  const url = `${site.url}/articles/${a.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: a.title,
        description: a.description,
        datePublished: a.publish_at,
        dateModified: a.updated_at,
        author: site.principal.name ? { "@id": `${site.url}/#principal` } : { "@type": "Organization", name: site.name },
        publisher: { "@id": `${site.url}/#firm` },
        mainEntityOfPage: url,
        articleSection: a.practiceName,
        wordCount: a.body.split(/\s+/).filter(Boolean).length,
        ...(a.cover_url ? { image: a.cover_url } : {}),
        inLanguage: "en-NG",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${site.url}/` },
          { "@type": "ListItem", position: 2, name: "Articles", item: `${site.url}/articles` },
          { "@type": "ListItem", position: 3, name: a.title, item: url },
        ],
      },
    ],
  };

  return (
    <main className="art">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <article>
        <header className="art__head">
          <nav className="art__crumbs" aria-label="Breadcrumb">
            <Link href="/articles">Articles</Link>
            <span aria-hidden="true">/</span>
            <span>{a.practiceName}</span>
          </nav>
          <h1>{a.title}</h1>
          {a.excerpt && <p className="art__standfirst">{a.excerpt}</p>}
          <div className="art__byline">
            <Image src={portrait} alt="" width={48} height={48} sizes="48px" className="art__avatar" />
            <span>
              <strong>{author}</strong>
              <span>
                <time dateTime={a.publish_at ?? undefined}>{fmt(a.publish_at)}</time> · {a.minutes} min read
              </span>
            </span>
          </div>
        </header>

        {a.cover_url && (
          <figure className="art__cover">
            {/* eslint-disable-next-line @next/next/no-img-element -- cover from our media bucket */}
            <img src={a.cover_url} alt={a.cover_alt ?? ""} />
          </figure>
        )}

        <div className="art__layout">
          {toc.length >= 3 && (
            <aside className="art__toc" aria-label="In this article">
              <p>In this article</p>
              <ol>
                {toc.map((h) => (
                  <li key={h.id}>
                    <a href={`#${h.id}`}>{h.text}</a>
                  </li>
                ))}
              </ol>
            </aside>
          )}
          <div className="art__main">
            <Markdown source={a.body} className="prose" />
            <ShareLinks url={url} title={a.title} />

            <section className="art-cta" aria-label="Next steps">
              <div>
                <h2>Is this your situation?</h2>
                <p>Every matter turns on its facts. Tell us what you&rsquo;re protecting and we&rsquo;ll advise you properly.</p>
                <a className="button" href="/#consult">
                  Request a consultation
                </a>
              </div>
              {book && (
                <div>
                  <h2>Go deeper</h2>
                  <p>
                    <em>{book.title}</em>: {book.hook}
                  </p>
                  <Link className="art-link art-link--cream" href={`/books/${book.slug}`}>
                    Read a free sample →
                  </Link>
                </div>
              )}
            </section>

            <aside className="art-author" aria-label="About the author">
              <Image src={portrait} alt={author} width={88} height={88} sizes="88px" className="art-author__img" />
              <div>
                <strong>{author}</strong>
                <p>
                  Principal of {site.name}, advising creators, businesses and property owners on intellectual property, media and
                  entertainment, corporate and commercial matters, and property.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="art-related" aria-labelledby="art-related">
          <h2 id="art-related">Keep reading</h2>
          <ul>
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/articles/${r.slug}`} className="art-row">
                  <p className="art-meta">
                    <span>{r.practiceName}</span>
                    <span>{r.minutes} min read</span>
                  </p>
                  <h3>{r.title}</h3>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
