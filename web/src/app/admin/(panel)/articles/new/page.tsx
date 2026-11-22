import type { Metadata } from "next";
import Link from "next/link";
import ArticleEditor from "@/components/admin/ArticleEditor";
import { requireAdmin } from "@/lib/admin/session";
import { PRACTICE_OPTIONS } from "@/lib/articles/catalog";
import { site } from "@/lib/site";
import "../../../../articles.css";

export const metadata: Metadata = { title: "New article" };

export default async function NewArticlePage() {
  await requireAdmin();
  return (
    <>
      <header className="a-head">
        <div>
          <Link href="/admin/articles" className="a-back">
            ← Articles
          </Link>
          <h1>New article</h1>
          <p>It stays private until you publish or schedule it.</p>
        </div>
      </header>
      <ArticleEditor
        mode="create"
        practices={PRACTICE_OPTIONS}
        author={site.principal.name ? `${site.principal.name} Esq.` : site.name}
        initial={{ slug: "", title: "", excerpt: "", body: "", practice: PRACTICE_OPTIONS[0].id, cover_url: null, cover_alt: null, featured: false, publish_at: null, state: "draft" }}
      />
    </>
  );
}

/** Admin screens read the session and live data on every request, so they block rather than prerender. */
export const instant = false;
