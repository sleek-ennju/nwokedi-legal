import type { Book, SamplePage } from "@/lib/books/types";
import { site } from "@/lib/site";

/**
 * Catalogue source until the admin (Phase 3) moves books into the database.
 *
 * ⚠ PLACEHOLDER LISTINGS — every entry below is a design stand-in, flagged
 * `placeholder: true`, so the store can be built and reviewed before her real
 * books arrive. Titles, prices and sample text are NOT hers. Replace each with
 * the real title, cover, price, synopsis, contents and sample pages.
 */

const AUTHOR = site.principal.name || "The Principal, Nwokedi Legal";

const placeholderSample = (title: string): SamplePage[] => [
  {
    kind: "text",
    heading: "A note on this sample",
    body: [
      `This is where the opening pages of ${title} will appear once the manuscript is supplied.`,
      "Readers will be able to turn through the first chapter here, exactly as it is typeset in the book, before deciding to buy.",
    ],
    folio: "i",
  },
  {
    kind: "text",
    heading: "Contents",
    body: ["Preface", "One — Where it begins", "Two — What the law sees", "Three — Putting it in writing", "Four — When it goes wrong"],
    folio: "ii",
  },
  {
    kind: "text",
    heading: "Preface",
    body: [
      "Placeholder text. The preface of the book sits here, set in the same typeface and measure as the printed page, so the reading experience on screen matches the book.",
      "Each page of the sample is a real page from the manuscript — not a summary — so readers get an honest feel for the voice and the depth of the work.",
    ],
    folio: "iii",
  },
  {
    kind: "text",
    heading: "One — Where it begins",
    body: [
      "Placeholder text. The first chapter opens here. Sample length is set by the author in the admin — typically the preface and the opening chapter.",
      "On a phone, readers swipe to turn the page; on a desktop they can click, drag the corner, or use the arrow keys.",
    ],
    folio: "1",
  },
  {
    kind: "text",
    body: [
      "Placeholder text. Pages continue in sequence until the end of the sample, where the reader is invited to buy the full book and have it delivered to their inbox in moments.",
      "Only these sample pages are ever sent to the browser. The full file stays in private storage and is released only after payment is confirmed.",
    ],
    folio: "2",
  },
  {
    kind: "text",
    body: ["Placeholder text. The final page of the sample."],
    folio: "3",
  },
];

export const BOOKS: Book[] = [
  {
    slug: "own-what-you-make",
    title: "Own What You Make",
    subtitle: "Intellectual property for creators and founders",
    author: AUTHOR,
    year: "2026",
    format: "PDF + EPUB",
    pages: 184,
    price: { NGN: 15000, USD: 15 },
    hook: "Trademarks, copyright and the deals that decide who owns your work.",
    synopsis: [
      "Placeholder synopsis. A clear, practical guide to protecting the things you create — names, logos, music, writing, software and designs — and to the contracts that decide who owns them.",
      "Written for creators and founders who want to understand their rights before they sign, not after.",
    ],
    contents: ["Why ownership matters", "Trademarks, plainly", "Copyright and the creative work", "Licensing without losing control", "When someone copies you"],
    forWhom: ["Musicians, writers and filmmakers", "Founders building a brand", "Agencies and freelancers"],
    cover: { theme: { bg: "#16253D", ink: "#E9E1CE", foil: "#C9A26B" } },
    sample: placeholderSample("Own What You Make"),
    status: "published",
    placeholder: true,
  },
  {
    slug: "the-deal-behind-the-art",
    title: "The Deal Behind the Art",
    subtitle: "Contracts in music, film and media",
    author: AUTHOR,
    year: "2026",
    format: "PDF",
    pages: 212,
    price: { NGN: 18000, USD: 18 },
    hook: "Recording, publishing, management and brand deals — read before you sign.",
    synopsis: [
      "Placeholder synopsis. Clause by clause, the agreements that shape creative careers: what they say, what they mean, and what to ask for.",
      "With checklists you can take into your next negotiation.",
    ],
    contents: ["Reading a recording contract", "Publishing and royalties", "Managers and agents", "Brand partnerships", "Leaving a deal well"],
    forWhom: ["Artists and their managers", "Producers and studios", "Brand and talent teams"],
    cover: { theme: { bg: "#E9E1CE", ink: "#16253D", foil: "#856244" } },
    sample: placeholderSample("The Deal Behind the Art"),
    status: "published",
    placeholder: true,
  },
  {
    slug: "ground-you-can-stand-on",
    title: "Ground You Can Stand On",
    subtitle: "Buying, leasing and protecting property in Nigeria",
    author: AUTHOR,
    year: "2026",
    format: "PDF",
    pages: 156,
    price: { NGN: 12000 },
    hook: "Title, due diligence and tenancy — the checks that protect a purchase.",
    synopsis: [
      "Placeholder synopsis. What to verify before you pay for land or a building, how leases really work, and how disputes are resolved.",
    ],
    contents: ["Before you pay", "Reading a title", "Leases and tenancy", "When a sale goes wrong"],
    forWhom: ["First-time buyers", "Landlords and tenants", "Investors in the diaspora"],
    cover: { theme: { bg: "#3A2410", ink: "#F1D9A8", foil: "#EDAF24" } },
    sample: placeholderSample("Ground You Can Stand On"),
    status: "coming-soon",
    placeholder: true,
  },
];
