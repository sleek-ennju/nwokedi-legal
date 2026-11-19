import type { Book } from "@/lib/books/types";
import { site } from "@/lib/site";

/**
 * The catalogue, until the admin (Phase 3) moves books into the database.
 *
 * Sample pages are rendered from the book's PDF with scripts/render-pdf-pages.mjs.
 * ONLY the sample pages are published (public/books/<slug>/sample/); the full PDF
 * lives in the private Supabase "books" bucket as <slug>.pdf.
 */

const AUTHOR = site.principal.name ? `${site.principal.name} Esq.` : "Miriam Nwokedi Esq.";
const sample = (slug: string, n: number) => `/books/${slug}/sample/${String(n).padStart(2, "0")}.webp`;
const MUSIC = "understanding-the-music-business-legally";

export const BOOKS: Book[] = [
  {
    slug: MUSIC,
    title: "Understanding the Music Business Legally",
    subtitle: "An indie upcoming artist's guide to success",
    series: "Part 1",
    author: AUTHOR,
    year: "2026",
    format: "PDF",
    pages: 29,
    // TODO(client): confirm price (and whether to sell in USD too)
    price: { NGN: 10000 },
    notice: "Preview edition — price to be confirmed",
    hook: "How the music business really works — the money, the people, and the traps — before you sign anything.",
    synopsis: [
      "A clear, practical guide for upcoming and independent artists who want to understand the business behind their music — not after they've signed, but before.",
      "By the end of Part 1 you'll understand how the industry is structured, who the key players are and what each one does, how music is created, owned, distributed and commercialised, and the difference between publishing rights and master recording rights.",
      "You'll know where royalties come from and who is entitled to collect them, how money moves through the industry, and what happens to a song after it is recorded and released.",
    ],
    contents: [
      "How the Music Business Works: The Money, the Opportunities and the Traps",
      "The People Behind Your Music: What They Do, How They Get Paid and What They're Entitled To",
      "Before You Release That Song: Split Sheets, Song Credits and Everything You Need to Sort Out",
      "Who Owns Your Music? Understanding Songwriting Rights and Master Recording Rights",
      "How Do You Make Money From Music? Understanding the Different Ways Artists Earn",
      "Music Royalties Explained: Where Your Money Comes From and Who Collects It",
      "Music Distribution: How Your Songs Get to Spotify, Apple Music and Other Platforms",
      "Music Publishing: Who Collects the Money When Your Songs Are Used?",
      "Streaming Money: How Streaming Platforms Pay Artists",
      "Protecting Your Music: Copyright, Registration and Your Rights",
    ],
    forWhom: ["Upcoming and independent artists", "Songwriters and producers", "Managers and creative entrepreneurs"],
    cover: {},
    sample: [
      { kind: "image", src: sample(MUSIC, 1), alt: "Title page: Understanding the Music Business Legally — Part 1, by Miriam Nwokedi Esq." },
      { kind: "image", src: sample(MUSIC, 2), alt: "Table of contents listing all ten chapters of Part 1" },
      { kind: "image", src: sample(MUSIC, 3), alt: "The purpose of Part 1: what you will understand by the end of the guide" },
      { kind: "image", src: sample(MUSIC, 4), alt: "Chapter 1 opener: an original song is divided into two rights — publishing and masters" },
      { kind: "image", src: sample(MUSIC, 5), alt: "The opening of Chapter 1: how artists make money, using real-life examples", teaser: true, width: 1000, height: 593 },
    ],
    status: "published",
  },
];
