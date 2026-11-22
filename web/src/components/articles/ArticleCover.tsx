import type { CSSProperties } from "react";
import { BRAND_COVERS } from "@/lib/books/cover";

/**
 * The house cover for an article with no image of its own: a chambers seal
 * stamped in foil, ringed with the practice name, the title set in Cormorant
 * like a book jacket. Each practice keeps its own palette, so the archive
 * reads as one collection. Sizes are in container units, so the same cover
 * works as a hero, a feature card or the editor's live preview.
 */
const PALETTE: Record<string, keyof typeof BRAND_COVERS> = {
  "intellectual-property": "midnight",
  "media-entertainment": "seal",
  "corporate-commercial": "umber",
  property: "vellum",
};

type Props = { title: string; practice: string; practiceName: string; author: string; className?: string };

export default function ArticleCover({ title, practice, practiceName, author, className }: Props) {
  const t = BRAND_COVERS[PALETTE[practice] ?? "midnight"];
  const n = title.trim().length;
  const size = n <= 26 ? "l" : n <= 56 ? "m" : "s";
  const ring = `${practiceName} · Nwokedi Legal · Chambers · `.toUpperCase();
  const id = `acv-ring-${practice}`;

  return (
    <div
      className={`acv acv--${PALETTE[practice] ?? "midnight"}${className ? ` ${className}` : ""}`}
      style={{ "--acv-bg": t.bg, "--acv-ink": t.ink, "--acv-foil": t.foil } as CSSProperties}
      aria-hidden="true"
    >
      <svg className="acv__seal" viewBox="0 0 200 200">
        <defs>
          <path id={id} d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <circle cx="100" cy="100" r="96" />
        <circle cx="100" cy="100" r="91" strokeDasharray="1 3.2" />
        <circle cx="100" cy="100" r="64" />
        <text>
          <textPath href={`#${id}`} textLength="486">
            {ring}
          </textPath>
        </text>
        <image href="/brand/emblem.svg" x="74" y="66" width="52" height="68" />
      </svg>
      <div className="acv__top">
        <span className="acv__house">Nwokedi Legal</span>
        <span className="acv__tag">Article</span>
      </div>
      <div className="acv__body">
        <span className="acv__practice">{practiceName}</span>
        <span className={`acv__title acv__title--${size}`}>{title.trim() || "Untitled"}</span>
        <span className="acv__rule" />
        <span className="acv__by">{author}</span>
      </div>
    </div>
  );
}
