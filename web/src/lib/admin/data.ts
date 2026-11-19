import "server-only";
import { db } from "@/lib/db/supabase";
import type { Order } from "@/lib/db/orders";
import { requireAdmin } from "./session";

/**
 * Admin data access. Every exported function checks the admin session itself
 * (never trusting that a page or layout already did), then reads with the
 * server's service client.
 */

const client = () => {
  const c = db();
  if (!c) throw new Error("Supabase is not configured");
  return c;
};

/** Lagos has no daylight saving: always UTC+1. */
const LAGOS = 3600_000;
export function lagosStart(unit: "day" | "month", now = new Date()) {
  const l = new Date(now.getTime() + LAGOS);
  const d = unit === "day" ? l.getUTCDate() : 1;
  return new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), d) - LAGOS);
}

export type Money = { NGN: number; USD: number };
const emptyMoney = (): Money => ({ NGN: 0, USD: 0 });
const addMoney = (m: Money, o: Pick<Order, "amount_minor" | "currency">) => {
  m[o.currency] += o.amount_minor / 100;
  return m;
};

/** PostgREST caps a response at 1000 rows; page through to `max`. */
async function all<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>, max = 50_000) {
  const out: T[] = [];
  for (let from = 0; from < max; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

// ── overview ──────────────────────────────────────────────────────
export async function getOverview() {
  await requireAdmin();
  const c = client();
  const monthStart = lagosStart("month");
  const dayStart = lagosStart("day");
  const since30 = new Date(Date.now() - 30 * 86400_000);

  const [paid, recent, enquiries, newEnquiries, visits] = await Promise.all([
    all<Pick<Order, "book_slug" | "amount_minor" | "currency" | "paid_at">>((f, t) =>
      c.from("orders").select("book_slug, amount_minor, currency, paid_at").eq("status", "paid").order("paid_at").range(f, t)
    ),
    c.from("orders").select("*").neq("status", "pending").order("created_at", { ascending: false }).limit(6),
    c.from("enquiries").select("id, name, practice, status, created_at").order("created_at", { ascending: false }).limit(5),
    c.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
    all<{ sid: string }>((f, t) =>
      c.from("events").select("sid").in("event", ["store_view", "book_view"]).gte("created_at", since30.toISOString()).range(f, t)
    ),
  ]);

  const today = emptyMoney();
  const month = emptyMoney();
  const total = emptyMoney();
  let todayCount = 0;
  let monthCount = 0;
  const perBook = new Map<string, number>();
  for (const o of paid) {
    const at = o.paid_at ? new Date(o.paid_at) : null;
    addMoney(total, o);
    if (at && at >= monthStart) {
      addMoney(month, o);
      monthCount++;
    }
    if (at && at >= dayStart) {
      addMoney(today, o);
      todayCount++;
    }
    perBook.set(o.book_slug, (perBook.get(o.book_slug) ?? 0) + 1);
  }
  const best = [...perBook.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    today: { count: todayCount, money: today },
    month: { count: monthCount, money: month },
    total: { count: paid.length, money: total },
    bestSeller: best ? { slug: best[0], sold: best[1] } : null,
    newEnquiries: newEnquiries.count ?? 0,
    visitors30: new Set(visits.map((v) => v.sid)).size,
    recentOrders: (recent.data ?? []) as Order[],
    recentEnquiries: (enquiries.data ?? []) as Pick<Enquiry, "id" | "name" | "practice" | "status" | "created_at">[],
  };
}

// ── orders ───────────────────────────────────────────────────────
export const ORDER_STATUSES = ["paid", "pending", "failed", "abandoned", "refunded"] as const;
export type OrderWithLinks = Order & { created_at: string; links: { count: number; uses: number; maxUses: number; expiresAt: string | null; live: boolean } };

/** keep search text safe inside a PostgREST or() filter */
const cleanQuery = (q: string) => q.replace(/[^\p{L}\p{N}@._ +-]/gu, "").trim().slice(0, 80);

export async function listOrders(opts: { q?: string; status?: string; page?: number }) {
  await requireAdmin();
  const c = client();
  const per = 25;
  const page = Math.max(1, opts.page ?? 1);
  let query = c.from("orders").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (opts.status && (ORDER_STATUSES as readonly string[]).includes(opts.status)) query = query.eq("status", opts.status);
  const q = cleanQuery(opts.q ?? "");
  if (q) query = query.or(`email.ilike.%${q}%,reference.ilike.%${q}%,name.ilike.%${q}%`);
  const { data, count, error } = await query.range((page - 1) * per, page * per - 1);
  if (error) throw new Error(error.message);
  const orders = (data ?? []) as (Order & { created_at: string })[];

  const ids = orders.map((o) => o.id);
  const { data: tokens } = ids.length
    ? await c.from("download_tokens").select("order_id, uses, max_uses, expires_at").in("order_id", ids)
    : { data: [] as { order_id: string; uses: number; max_uses: number; expires_at: string }[] };

  const withLinks: OrderWithLinks[] = orders.map((o) => {
    const mine = (tokens ?? []).filter((t) => t.order_id === o.id);
    return {
      ...o,
      links: {
        count: mine.length,
        uses: mine.reduce((s, t) => s + t.uses, 0),
        maxUses: mine.reduce((s, t) => s + t.max_uses, 0),
        expiresAt: mine.map((t) => t.expires_at).sort().at(-1) ?? null,
        live: mine.some((t) => Date.parse(t.expires_at) > Date.now() && t.uses < t.max_uses),
      },
    };
  });
  return { orders: withLinks, total: count ?? 0, page, pages: Math.max(1, Math.ceil((count ?? 0) / per)) };
}

export async function getOrderById(id: string) {
  await requireAdmin();
  const { data } = await client().from("orders").select("*").eq("id", id).maybeSingle();
  return (data as Order | null) ?? null;
}

export async function setOrderRefunded(id: string) {
  await requireAdmin();
  const { data, error } = await client().from("orders").update({ status: "refunded" }).eq("id", id).eq("status", "paid").select("id");
  if (error) throw new Error(error.message);
  return Boolean(data?.length);
}

// ── customers ────────────────────────────────────────────────────
export type Customer = { email: string; name: string; orders: number; books: string[]; spent: Money; first: string; last: string };

export async function listCustomers(): Promise<Customer[]> {
  await requireAdmin();
  const c = client();
  const paid = await all<Pick<Order, "email" | "name" | "book_slug" | "amount_minor" | "currency" | "paid_at">>((f, t) =>
    c.from("orders").select("email, name, book_slug, amount_minor, currency, paid_at").eq("status", "paid").order("paid_at").range(f, t)
  );
  const map = new Map<string, Customer>();
  for (const o of paid) {
    const at = o.paid_at ?? "";
    const cu = map.get(o.email) ?? { email: o.email, name: o.name, orders: 0, books: [], spent: emptyMoney(), first: at, last: at };
    cu.orders++;
    cu.name = o.name; // most recent spelling wins
    if (!cu.books.includes(o.book_slug)) cu.books.push(o.book_slug);
    addMoney(cu.spent, o);
    cu.last = at;
    map.set(o.email, cu);
  }
  return [...map.values()].sort((a, b) => b.last.localeCompare(a.last));
}

// ── enquiries ────────────────────────────────────────────────────
export const ENQUIRY_STATUSES = ["new", "replied", "archived"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];
export type Enquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  practice: string;
  message: string;
  status: EnquiryStatus;
  created_at: string;
};

export async function listEnquiries(status?: string) {
  await requireAdmin();
  const c = client();
  let q = c.from("enquiries").select("*").order("created_at", { ascending: false }).limit(200);
  if (status && (ENQUIRY_STATUSES as readonly string[]).includes(status)) q = q.eq("status", status);
  else q = q.neq("status", "archived");
  const [{ data, error }, counts] = await Promise.all([
    q,
    Promise.all(ENQUIRY_STATUSES.map((s) => c.from("enquiries").select("id", { count: "exact", head: true }).eq("status", s))),
  ]);
  if (error) throw new Error(error.message);
  return {
    enquiries: (data ?? []) as Enquiry[],
    counts: Object.fromEntries(ENQUIRY_STATUSES.map((s, i) => [s, counts[i].count ?? 0])) as Record<EnquiryStatus, number>,
  };
}

export async function setEnquiryStatus(id: string, status: EnquiryStatus) {
  await requireAdmin();
  const { error } = await client().from("enquiries").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

// ── analytics ────────────────────────────────────────────────────
export type EventRow = {
  event: string;
  sid: string;
  slug: string | null;
  n: number | null;
  currency: string | null;
  referrer: string | null;
  utm: string | null;
  device: string | null;
  created_at: string;
};

export async function getAnalyticsData(days: number) {
  await requireAdmin();
  const c = client();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const [events, orders] = await Promise.all([
    all<EventRow>((f, t) =>
      c
        .from("events")
        .select("event, sid, slug, n, currency, referrer, utm, device, created_at")
        .gte("created_at", since)
        .order("created_at")
        .range(f, t)
    ),
    all<Pick<Order, "book_slug" | "amount_minor" | "currency" | "status" | "meta"> & { created_at: string }>((f, t) =>
      c.from("orders").select("book_slug, amount_minor, currency, status, meta, created_at").gte("created_at", since).range(f, t)
    ),
  ]);
  return { events, orders };
}
