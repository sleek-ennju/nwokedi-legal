import type { MetadataRoute } from "next";
import { getBooks } from "@/lib/books/catalog";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const books = await getBooks();
  return [
    { url: `${site.url}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${site.url}/books`, changeFrequency: "weekly", priority: 0.8 },
    ...books.map((b) => ({ url: `${site.url}/books/${b.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
