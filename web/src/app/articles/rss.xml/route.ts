import { getArticles } from "@/lib/articles/catalog";
import { plainText } from "@/lib/articles/markdown";
import { site } from "@/lib/site";

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

/** RSS for readers, newsletters and aggregators. */
export async function GET() {
  const articles = await getArticles();
  const author = site.principal.name ? `${site.principal.name} Esq.` : site.name;
  const items = articles
    .slice(0, 50)
    .map((a) => {
      const url = `${site.url}/articles/${a.slug}`;
      return `<item><title>${esc(a.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid>${a.publish_at ? `<pubDate>${new Date(a.publish_at).toUTCString()}</pubDate>` : ""}<category>${esc(a.practiceName)}</category><dc:creator>${esc(author)}</dc:creator><description>${esc(a.excerpt || plainText(a.body).slice(0, 300))}</description></item>`;
    })
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>${esc(`Articles · ${site.name}`)}</title><link>${site.url}/articles</link><atom:link href="${site.url}/articles/rss.xml" rel="self" type="application/rss+xml"/><description>${esc(`Writing by ${author} on intellectual property, media and entertainment, corporate and commercial work, and property.`)}</description><language>en-NG</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600" } });
}
