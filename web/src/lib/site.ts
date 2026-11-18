/**
 * Single source of truth for firm facts. Used by the page copy, the JSON-LD
 * structured data, the sitemap and the metadata — change a fact here once.
 *
 * TODO(client): principal's full name, profiles, domain, email, address.
 * Anything left empty is simply omitted from the structured data.
 */
export const site = {
  name: "Nwokedi Legal",
  legalName: "Nwokedi Legal",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://nwokedilegal.com").replace(/\/$/, ""),
  tagline: "Barristers & Solicitors",
  founded: "2025",
  description:
    "Nwokedi Legal advises creators, founders and businesses on intellectual property, media and entertainment, corporate and commercial matters, and property in Nigeria.",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  telephone: process.env.NEXT_PUBLIC_PHONE ?? "",
  /** direct lines shown beside the enquiry form (E.164, e.g. +2348012345678) */
  contact: {
    phone: process.env.NEXT_PUBLIC_PHONE ?? "",
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? process.env.NEXT_PUBLIC_PHONE ?? "",
  },
  address: { locality: "", region: "", country: "NG" },
  /**
   * Social profiles — TODO(client): full profile URLs. Empty ones render as
   * placeholders in the footer and are left out of the structured data.
   */
  social: {
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM ?? "",
    linkedin: process.env.NEXT_PUBLIC_LINKEDIN ?? "",
    x: process.env.NEXT_PUBLIC_X ?? "",
    tiktok: process.env.NEXT_PUBLIC_TIKTOK ?? "",
    youtube: process.env.NEXT_PUBLIC_YOUTUBE ?? "",
  },
  get sameAs(): string[] {
    return Object.values(this.social).filter(Boolean);
  },
  principal: {
    name: process.env.NEXT_PUBLIC_PRINCIPAL_NAME ?? "",
    jobTitle: "Principal",
    sameAs: [] as string[],
  },
};

export type Practice = {
  id: string;
  name: string;
  tag: string;
  body: string;
  list: string[];
  short: string;
};

export const practices: Practice[] = [
  {
    id: "intellectual-property",
    name: "Intellectual Property",
    tag: "Your ideas, on the record.",
    body: "Trademarks, copyright, patents and designs — searched, registered, licensed and enforced, so the value you create stays yours.",
    list: [
      "Trademark & brand protection",
      "Copyright & licensing",
      "Patents & industrial designs",
      "Infringement & enforcement",
    ],
    short: "Registration, licensing and enforcement for the ideas and marks that make your work valuable.",
  },
  {
    id: "media-entertainment",
    name: "Media & Entertainment",
    tag: "The deal behind the art.",
    body: "Music, film, publishing and talent — the agreements that decide who owns the work, who gets paid, and for how long.",
    list: [
      "Recording & publishing agreements",
      "Film, TV & content production",
      "Talent & management contracts",
      "Brand partnerships & endorsements",
    ],
    short: "The agreements that decide who owns the work, who gets paid, and for how long.",
  },
  {
    id: "corporate-commercial",
    name: "Corporate & Commercial",
    tag: "Structure that holds.",
    body: "From incorporation to the contracts you sign every week — governance, compliance and transactions built to last.",
    list: [
      "Company formation & governance",
      "Commercial contracts",
      "Regulatory compliance",
      "Investment & transactions",
    ],
    short: "Formation, governance, contracts and compliance — structure that holds as you grow.",
  },
  {
    id: "property",
    name: "Property",
    tag: "Ground you can stand on.",
    body: "Acquisitions, leases and title — verified before you commit, and defended if it is ever questioned.",
    list: ["Acquisitions & sales", "Title verification & due diligence", "Leases & tenancy", "Property disputes"],
    short: "Acquisitions, title and tenancy — verified before you commit, defended if questioned.",
  },
];

/** "What are you protecting?" options → practice index */
export const protectOptions = [
  { label: "A name or a logo", to: 0 },
  { label: "A song, a film or a show", to: 1 },
  { label: "A company", to: 2 },
  { label: "Land or a building", to: 3 },
  { label: "An invention", to: 0 },
  { label: "A creative career", to: 1 },
];
