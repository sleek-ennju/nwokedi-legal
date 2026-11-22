import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleEditor from "@/components/admin/ArticleEditor";
import { getArticleAdmin } from "@/lib/admin/articles";
import { day } from "@/lib/admin/format";
import { PRACTICE_OPTIONS } from "@/lib/articles/catalog";
import { site } from "@/lib/site";
import "../../../../articles.css";

export const metadata: Metadata = { title: "Edit article" };

export default async function EditArticlePage({ params }: PageProps<"/admin/articles/[slug]">) {
  const { slug } = await params;
  const a = await getArticleAdmin(slug);
  if (!a) notFound();

  return (
    <>
      <header className="a-head">
        <div>
          <Link href="/admin/articles" className="a-back">
            ← Articles
          </Link>
          <h1>{a.title || "Untitled"}</h1>
          <p>
            {a.state === "published" ? `Published ${day(a.publish_at)}` : a.state === "scheduled" ? `Scheduled for ${day(a.publish_at)}` : "Draft"} · last saved {day(a.updated_at)}
          </p>
        </div>
      </header>
      <ArticleEditor
        key={a.updated_at}
        mode="update"
        practices={PRACTICE_OPTIONS}
        author={site.principal.name ? `${site.principal.name} Esq.` : site.name}
        initial={{
          slug: a.slug,
          title: a.title,
          excerpt: a.excerpt,
          body: a.body,
          practice: a.practice,
          cover_url: a.cover_url,
          cover_alt: a.cover_alt,
          featured: a.featured,
          publish_at: a.publish_at,
          state: a.state,
        }}
      />
    </>
  );
}

/** Admin screens read the session and live data on every request, so they block rather than prerender. */
export const instant = false;
