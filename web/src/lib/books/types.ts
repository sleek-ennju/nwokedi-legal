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
  | {
      kind: "image";
      src: string;
      alt: string;
      /** a cropped page that fades out — the cliffhanger before "Keep reading" */
      teaser?: boolean;
      /** intrinsic size, required for teaser (cropped) pages */
      width?: number;
      height?: number;
    };

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
  /** theme is optional: without one, a brand cover is generated from the title */
  cover: { theme?: CoverTheme; image?: string };
  /** e.g. "Part 1" — shown on the generated cover */
  series?: string;
  /** small notice shown as a badge, e.g. "Preview edition — price to be confirmed" */
  notice?: string;
  sample: SamplePage[];
  status: "published" | "coming-soon";
  /** TRUE until the client supplies the real book — shows a "Sample listing" badge */
  placeholder?: boolean;
};

export type Currency = keyof Book["price"];
