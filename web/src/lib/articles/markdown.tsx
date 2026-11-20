import type { ReactNode } from "react";

/**
 * A small, safe Markdown renderer for articles. It only ever produces React
 * elements (never raw HTML), so nothing a writer types can inject markup or
 * scripts. Supported, which is all an article needs:
 *
 *   ## Heading   ### Subheading   paragraphs   > quote   - list   1. list
 *   **bold**  *italic*  [link](https://…)  ![alt](https://image)  ---
 *
 * Shared by the public article page and the editor's live preview.
 */

const SAFE_URL = /^(https?:\/\/|\/(?!\/)|mailto:|#)/i;

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  // order matters: links before emphasis so URLs keep their asterisks/underscores
  const re = /(\[([^\]]+)\]\(([^)\s]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(_([^_]+)_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    if (m[1]) {
      const href = m[3];
      const external = /^https?:\/\//i.test(href);
      out.push(
        SAFE_URL.test(href) ? (
          <a key={k} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            {inline(m[2], k)}
          </a>
        ) : (
          m[2]
        )
      );
    } else if (m[4]) out.push(<strong key={k}>{inline(m[5], k)}</strong>);
    else if (m[6]) out.push(<em key={k}>{inline(m[7], k)}</em>);
    else if (m[8]) out.push(<em key={k}>{inline(m[9], k)}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export type Heading = { id: string; text: string; level: 2 | 3 };

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[*_`[\]()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/** Headings for a table of contents (and to anchor each section). */
export function headings(md: string): Heading[] {
  const used = new Map<string, number>();
  return md
    .split(/\r?\n/)
    .map((l) => /^(##|###)\s+(.+)$/.exec(l.trim()))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => {
      const base = slugify(m[2]) || "section";
      const n = used.get(base) ?? 0;
      used.set(base, n + 1);
      return { id: n ? `${base}-${n}` : base, text: m[2].replace(/[*_]/g, ""), level: m[1].length as 2 | 3 };
    });
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  const ids = headings(source);
  let h = 0;
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    const key = `b${k++}`;

    if (!t) {
      i++;
      continue;
    }
    let m: RegExpExecArray | null;
    if ((m = /^(##|###)\s+(.+)$/.exec(t))) {
      const id = ids[h++]?.id;
      blocks.push(m[1] === "##" ? <h2 key={key} id={id}>{inline(m[2], key)}</h2> : <h3 key={key} id={id}>{inline(m[2], key)}</h3>);
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(t)) {
      blocks.push(<hr key={key} />);
      i++;
      continue;
    }
    if ((m = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(t))) {
      if (SAFE_URL.test(m[2])) {
        blocks.push(
          <figure key={key}>
            {/* eslint-disable-next-line @next/next/no-img-element -- writer-supplied image from our media bucket */}
            <img src={m[2]} alt={m[1]} loading="lazy" decoding="async" />
            {m[1] && <figcaption>{m[1]}</figcaption>}
          </figure>
        );
      }
      i++;
      continue;
    }
    if (t.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) quote.push(lines[i++].trim().replace(/^>\s?/, ""));
      blocks.push(<blockquote key={key}>{quote.join(" ").split(/\s{2,}/).map((p, j) => <p key={j}>{inline(p, `${key}-${j}`)}</p>)}</blockquote>);
      continue;
    }
    if (/^[-*]\s+/.test(t) || /^\d+[.)]\s+/.test(t)) {
      const ordered = /^\d/.test(t);
      const items: string[] = [];
      const itemRe = ordered ? /^\d+[.)]\s+/ : /^[-*]\s+/;
      while (i < lines.length && itemRe.test(lines[i].trim())) items.push(lines[i++].trim().replace(itemRe, ""));
      const children = items.map((it, j) => <li key={j}>{inline(it, `${key}-${j}`)}</li>);
      blocks.push(ordered ? <ol key={key}>{children}</ol> : <ul key={key}>{children}</ul>);
      continue;
    }
    // paragraph: consecutive plain lines
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(##|###)\s|^>|^[-*]\s+|^\d+[.)]\s+|^!\[|^(-{3,}|\*{3,})$/.test(lines[i].trim())) para.push(lines[i++].trim());
    blocks.push(<p key={key}>{inline(para.join(" "), key)}</p>);
  }

  return <div className={className}>{blocks}</div>;
}

/** Words → minutes at a calm 220 wpm; at least 1. */
export const readingMinutes = (md: string) => Math.max(1, Math.round(md.split(/\s+/).filter(Boolean).length / 220));

/** Plain text (for descriptions, RSS, search). */
export const plainText = (md: string) =>
  md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{2,3}\s+|^>\s?|^[-*]\s+|^\d+[.)]\s+/gm, "")
    .replace(/[*_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
