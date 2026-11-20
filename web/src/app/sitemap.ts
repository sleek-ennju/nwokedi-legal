import type { MetadataRoute } from "next";
import { getArticles } from "@/lib/articles/catalog";
import { getBooks } from "@/lib/books/catalog";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [books, articles] = await Promise.all([getBooks(), getArticles()]);
  return [
    { url: `${site.url}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${site.url}/books`, changeFrequency: "weekly", priority: 0.8 },
    ...books.map((b) => ({ url: `${site.url}/books/${b.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${site.url}/articles`, changeFrequency: "weekly", priority: 0.8 },
    ...articles.map((a) => ({ url: `${site.url}/articles/${a.slug}`, lastModified: a.updated_at, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
