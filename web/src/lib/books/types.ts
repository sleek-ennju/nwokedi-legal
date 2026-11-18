export type CoverTheme = {
  /** cover background */
  bg: string;
  /** main text colour */
  ink: string;
  /** foil / accent colour (rules, emblem, author) */
  foil: string;
  /** spine colour (defaults to bg) */
  spine?: string;
};

export type SamplePage =
  | { kind: "text"; heading?: string; body: string[]; folio?: string }
  | { kind: "image"; src: string; alt: string };

export type Book = {
  slug: string;
  title: string;
  subtitle?: string;
  author: string;
  year: string;
  format: "PDF" | "EPUB" | "PDF + EPUB";
  pages: number;
  /** prices in whole units (₦ / $). USD is optional. */
  price: { NGN: number; USD?: number };
  /** one-line hook for cards */
  hook: string;
  synopsis: string[];
  contents: string[];
  forWhom: string[];
  cover: { theme: CoverTheme; image?: string };
  sample: SamplePage[];
  status: "published" | "coming-soon";
  /** TRUE until the client supplies the real book — shows a "Sample listing" badge */
  placeholder?: boolean;
};

export type Currency = keyof Book["price"];
