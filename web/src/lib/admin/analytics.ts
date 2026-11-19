import type { EventRow } from "./data";

/**
 * Turns raw store events into the answers in PROJECT_PLAN §4.1. Pure function:
 * sessions are anonymous `sid`s (per browser tab, no cookies), so every rate here
 * is "of visits", not "of people".
 */

type OrderLite = { book_slug: string; amount_minor: number; currency: "NGN" | "USD"; status: string; created_at: string };

export const FUNNEL = [
  ["store_view", "Visited the store"],
  ["book_view", "Opened a book"],
  ["sample_open", "Read the sample"],
  ["checkout_start", "Started checkout"],
  ["payment_success", "Paid"],
] as const;

const pct = (a: number, b: number) => (b ? a / b : 0);

export function computeAnalytics(events: EventRow[], orders: OrderLite[], days: number) {
  // one record per visit
  type Visit = {
    first: number;
    stages: Set<string>;
    books: Set<string>;
    sampleDepth: number;
    source: string;
    device: string;
    paidAt: number | null;
  };
  const visits = new Map<string, Visit>();
  for (const e of events) {
    const t = Date.parse(e.created_at);
    let v = visits.get(e.sid);
    if (!v) {
      v = { first: t, stages: new Set(), books: new Set(), sampleDepth: 0, source: sourceOf(e), device: e.device ?? "unknown", paidAt: null };
      visits.set(e.sid, v);
    }
    v.stages.add(e.event);
    if (e.event === "sample_open") v.sampleDepth = Math.max(v.sampleDepth, 1);
    if (e.event === "sample_page" && e.n) v.sampleDepth = Math.max(v.sampleDepth, e.n);
    if (e.slug && e.event === "book_view") v.books.add(e.slug);
    if (e.event === "payment_success" && v.paidAt === null) v.paidAt = t;
  }
  const all = [...visits.values()];
  // a visit that reached any stage counts for the stages above it (e.g. a direct link to a book page)
  const reached = (stage: string) => {
    const i = FUNNEL.findIndex(([s]) => s === stage);
    return all.filter((v) => FUNNEL.slice(i).some(([s]) => v.stages.has(s))).length;
  };
  const funnel = FUNNEL.map(([key, label]) => ({ key, label, count: reached(key) }));

  // ── per book ──
  const bookStats = new Map<string, { views: number; samples: number; checkouts: number; paid: number; revenue: { NGN: number; USD: number } }>();
  const bs = (slug: string) => {
    let b = bookStats.get(slug);
    if (!b) bookStats.set(slug, (b = { views: 0, samples: 0, checkouts: 0, paid: 0, revenue: { NGN: 0, USD: 0 } }));
    return b;
  };
  const seen = new Set<string>();
  for (const e of events) {
    if (!e.slug) continue;
    const k = `${e.sid}|${e.slug}|${e.event}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (e.event === "book_view") bs(e.slug).views++;
    if (e.event === "sample_open") bs(e.slug).samples++;
    if (e.event === "checkout_start") bs(e.slug).checkouts++;
  }
  for (const o of orders) {
    if (o.status !== "paid") continue;
    const b = bs(o.book_slug);
    b.paid++;
    b.revenue[o.currency] += o.amount_minor / 100;
  }
  const books = [...bookStats.entries()]
    // null when sales outnumber tracked views (e.g. bought through a direct link before tracking began)
    .map(([slug, b]) => ({ slug, ...b, conversion: b.views >= b.paid && b.views > 0 ? pct(b.paid, b.views) : null }))
    .sort((a, b) => b.paid - a.paid || b.views - a.views);

  // ── does the sample sell the book? ──
  const readers = all.filter((v) => v.sampleDepth > 0);
  const viewers = all.filter((v) => v.stages.has("book_view") || v.stages.has("checkout_start"));
  const nonReaders = viewers.filter((v) => v.sampleDepth === 0);
  const depth = new Map<number, number>();
  for (const v of readers) depth.set(v.sampleDepth, (depth.get(v.sampleDepth) ?? 0) + 1);
  const maxDepth = Math.max(0, ...depth.keys());
  const sample = {
    readers: readers.length,
    readerBuyRate: pct(readers.filter((v) => v.paidAt).length, readers.length),
    nonReaderBuyRate: pct(nonReaders.filter((v) => v.paidAt).length, nonReaders.length),
    nonReaders: nonReaders.length,
    // how many readers got at least as far as page n
    depth: Array.from({ length: maxDepth }, (_, i) => ({
      page: i + 1,
      readers: readers.filter((v) => v.sampleDepth >= i + 1).length,
    })),
  };

  // ── sources & devices ──
  const group = (key: (v: Visit) => string) => {
    const m = new Map<string, { visits: number; paid: number }>();
    for (const v of all) {
      const k = key(v);
      const g = m.get(k) ?? { visits: 0, paid: 0 };
      g.visits++;
      if (v.paidAt) g.paid++;
      m.set(k, g);
    }
    return [...m.entries()].map(([name, g]) => ({ name, ...g, conversion: pct(g.paid, g.visits) })).sort((a, b) => b.visits - a.visits);
  };

  // ── time to purchase (from first event in the visit) ──
  const waits = all.filter((v) => v.paidAt).map((v) => (v.paidAt! - v.first) / 60_000).sort((a, b) => a - b);
  const median = waits.length ? waits[Math.floor(waits.length / 2)] : null;

  // ── checkout currency + abandonment ──
  const startedCurrency = { NGN: 0, USD: 0 } as Record<string, number>;
  for (const e of events) if (e.event === "checkout_start" && e.currency) startedCurrency[e.currency] = (startedCurrency[e.currency] ?? 0) + 1;
  const ordersCreated = orders.length;
  const ordersPaid = orders.filter((o) => o.status === "paid").length;

  // ── daily visits ──
  const daily: { day: string; visits: number; paid: number }[] = [];
  const dayKey = (t: number) => new Date(t + 3600_000).toISOString().slice(0, 10); // Lagos date
  const start = Date.now() - (days - 1) * 86400_000;
  for (let i = 0; i < days; i++) daily.push({ day: dayKey(start + i * 86400_000), visits: 0, paid: 0 });
  const idx = new Map(daily.map((d, i) => [d.day, i]));
  for (const v of all) {
    const i = idx.get(dayKey(v.first));
    if (i !== undefined) daily[i].visits++;
  }
  for (const o of orders) {
    const i = idx.get(dayKey(Date.parse(o.created_at)));
    if (i !== undefined && o.status === "paid") daily[i].paid++;
  }

  return {
    visits: all.length,
    paidVisits: all.filter((v) => v.paidAt).length,
    funnel,
    books,
    sample,
    sources: group((v) => v.source),
    devices: group((v) => v.device),
    medianMinutesToPurchase: median,
    checkout: { startedCurrency, ordersCreated, ordersPaid, abandonRate: pct(ordersCreated - ordersPaid, ordersCreated) },
    daily,
  };
}

const KNOWN: [RegExp, string][] = [
  [/instagram|^l\.instagram/, "Instagram"],
  [/linkedin|lnkd\.in/, "LinkedIn"],
  [/google\./, "Google"],
  [/bing\.|duckduckgo|yahoo\./, "Other search"],
  [/whatsapp|wa\.me/, "WhatsApp"],
  [/facebook|fb\.|m\.facebook/, "Facebook"],
  [/twitter|t\.co$|x\.com/, "X / Twitter"],
  [/tiktok/, "TikTok"],
];

function sourceOf(e: EventRow): string {
  const raw = (e.utm || e.referrer || "").toLowerCase();
  if (!raw) return "Direct / unknown";
  for (const [re, name] of KNOWN) if (re.test(raw)) return name;
  if (/vercel\.app$|nwokedi|^localhost$|^127\./.test(raw)) return "Direct / unknown"; // moved between pages of this site
  return raw;
}
