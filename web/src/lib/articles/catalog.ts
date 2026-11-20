import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db/supabase";
import { practices } from "@/lib/site";
import { plainText, readingMinutes } from "./markdown";

/**
 * Public articles: published, and due (publish_at ≤ now). Cached under the
 * "articles" tag and refreshed the moment one is saved; scheduled pieces go
 * live on their date (within the hour, as the cache renews).
 */
export const ARTICLES_TAG = "articles";

export type ArticleRow = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  practice: string;
  cover_url: string | null;
  cover_alt: string | null;
  status: "draft" | "published";
  publish_at: string | null;
  featured: boolean;
  created_at: string;
  updated_at: string;
};

export type Article = ArticleRow & { minutes: number; practiceName: string; description: string };

export const PRACTICE_OPTIONS = [...practices.map((p) => ({ id: p.id, name: p.name })), { id: "general", name: "General" }];
export const practiceName = (id: string) => PRACTICE_OPTIONS.find((p) => p.id === id)?.name ?? "General";

export function toArticle(r: ArticleRow): Article {
  const text = plainText(r.body);
  return {
    ...r,
    minutes: readingMinutes(r.body),
    practiceName: practiceName(r.practice),
    description: (r.excerpt || text).slice(0, 180),
  };
}

async function publishedRows(): Promise<ArticleRow[]> {
  "use cache";
  cacheTag(ARTICLES_TAG);
  cacheLife("hours");
  const c = db();
  if (!c) return [];
  const { data, error } = await c.from("articles").select("*").eq("status", "published").order("publish_at", { ascending: false }).limit(500);
  if (error) {
    if (!/articles/.test(error.message)) console.error("[articles] load", error.message);
    return [];
  }
  // the "is it due?" check lives inside the cached scope, so pages stay static;
  // a scheduled piece goes live when this entry renews (hourly) or on any save
  const now = Date.now();
  return (data as ArticleRow[]).filter((r) => r.publish_at && Date.parse(r.publish_at) <= now);
}

/** Live articles, newest first. */
export async function getArticles(): Promise<Article[]> {
  return (await publishedRows()).map(toArticle);
}

export async function getArticle(slug: string) {
  return (await getArticles()).find((a) => a.slug === slug);
}
