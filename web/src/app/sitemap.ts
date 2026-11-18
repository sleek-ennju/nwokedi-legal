import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  // Phase 2 adds /books and every /books/[slug]; Insights adds /insights/[slug].
  return [{ url: `${site.url}/`, changeFrequency: "monthly", priority: 1 }];
}
