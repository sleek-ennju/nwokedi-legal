import type { Book, CoverTheme } from "./types";

/**
 * Brand cover generator. Books without an uploaded cover get a typographic
 * cover in one of the brand's palettes. The palette is picked deterministically
 * from the slug, so a book always keeps the same cover, and a catalogue of
 * several books naturally varies.
 */
export const BRAND_COVERS: Record<string, CoverTheme> = {
  midnight: { bg: "#16253D", ink: "#E9E1CE", foil: "#C9A26B" },
  vellum: { bg: "#ECE4D2", ink: "#16253D", foil: "#856244", spine: "#E2D8C2" },
  umber: { bg: "#2E1C0D", ink: "#F1D9A8", foil: "#EDAF24" },
  seal: { bg: "#6E1418", ink: "#F3EEE3", foil: "#EDAF24" },
};
const ORDER = ["midnight", "seal", "umber", "vellum"] as const;

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function coverTheme(book: Pick<Book, "slug" | "cover">): CoverTheme {
  return book.cover.theme ?? BRAND_COVERS[ORDER[hash(book.slug) % ORDER.length]];
}

/** Title size as a fraction of cover width: long titles step down so they stay on 3–4 lines. */
export function titleScale(title: string) {
  const n = title.length;
  if (n <= 18) return 0.14;
  if (n <= 30) return 0.122;
  if (n <= 44) return 0.104;
  return 0.09;
}
