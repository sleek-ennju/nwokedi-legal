import "server-only";
import { db } from "@/lib/db/supabase";
import { toArticle, type Article, type ArticleRow } from "@/lib/articles/catalog";
import { requireAdmin } from "./session";

export type ArticleState = "draft" | "scheduled" | "published";
export const stateOf = (a: Pick<ArticleRow, "status" | "publish_at">, now: number): ArticleState =>
  a.status === "draft" ? "draft" : a.publish_at && Date.parse(a.publish_at) > now ? "scheduled" : "published";

/** All articles for the dashboard. `ready` is false until the articles migration has run. */
export async function listArticlesAdmin(): Promise<{ articles: (Article & { state: ArticleState })[]; ready: boolean }> {
  await requireAdmin();
  const c = db();
  if (!c) return { articles: [], ready: false };
  const { data, error } = await c.from("articles").select("*").order("updated_at", { ascending: false }).limit(500);
  if (error) return { articles: [], ready: false };
  const now = Date.now();
  return { articles: (data as ArticleRow[]).map((r) => ({ ...toArticle(r), state: stateOf(r, now) })), ready: true };
}

export async function getArticleAdmin(slug: string): Promise<(Article & { state: ArticleState }) | null> {
  await requireAdmin();
  const { data } = (await db()?.from("articles").select("*").eq("slug", slug).maybeSingle()) ?? {};
  return data ? { ...toArticle(data as ArticleRow), state: stateOf(data as ArticleRow, Date.now()) } : null;
}
