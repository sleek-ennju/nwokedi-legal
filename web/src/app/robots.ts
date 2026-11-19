import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // review/preview deployments must never be indexed (would compete with launch)
  if (process.env.SITE_NOINDEX === "1") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/download/"] }],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
