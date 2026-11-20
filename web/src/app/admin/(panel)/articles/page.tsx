import type { Metadata } from "next";
import Link from "next/link";
import { listArticlesAdmin } from "@/lib/admin/articles";
import { day } from "@/lib/admin/format";

export const metadata: Metadata = { title: "Articles" };

const LABEL = { draft: "Draft", scheduled: "Scheduled", published: "Published" } as const;
const PILL = { draft: "draft", scheduled: "coming-soon", published: "published" } as const;

export default async function ArticlesAdminPage() {
  const { articles, ready } = await listArticlesAdmin();

  return (
    <>
      <header className="a-head">
        <div>
          <h1>Articles</h1>
          <p>Write, schedule and publish. Every article helps people find you on Google, and each one links to a consultation and your book.</p>
        </div>
        {ready && (
          <Link className="a-btn" href="/admin/articles/new">
            New article
          </Link>
        )}
      </header>

      {!ready ? (
        <section className="a-card a-callout a-callout--warn">
          <h2>Articles need a one-time set-up</h2>
          <p className="a-card__sub">
            Your developer runs <code>supabase/migrations/20261122120000_articles.sql</code> in Supabase once, then you can start writing.
          </p>
        </section>
      ) : articles.length === 0 ? (
        <section className="a-card ws-clear-card">
          <h2>Your first article</h2>
          <p className="a-card__sub">
            Good first pieces answer a question clients keep asking you: “Do I need to register my brand?”, “What should a recording contract
            say about royalties?”. Plain language, a few headings, and a clear next step.
          </p>
          <Link className="a-btn" href="/admin/articles/new">
            Start writing
          </Link>
        </section>
      ) : (
        <section className="a-card">
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Practice area</th>
                  <th>Status</th>
                  <th className="num">Length</th>
                  <th className="num">Date</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => (
                  <tr key={a.slug}>
                    <td>
                      <Link href={`/admin/articles/${a.slug}`} className="ae-title-link">
                        {a.title || "Untitled"}
                      </Link>
                      {a.featured && <div className="a-small a-mute">Featured</div>}
                    </td>
                    <td className="a-small">{a.practiceName}</td>
                    <td>
                      <span className={`a-pill a-pill--${PILL[a.state]}`}>{LABEL[a.state]}</span>
                    </td>
                    <td className="num a-small">{a.minutes} min</td>
                    <td className="num a-small a-mute">{a.state === "draft" ? `edited ${day(a.updated_at)}` : day(a.publish_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

/** Admin screens read the session and live data on every request, so they block rather than prerender. */
export const instant = false;
