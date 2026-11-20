import "server-only";
import { db } from "@/lib/db/supabase";
import { loadSettings } from "@/lib/settings";
import { listBooksAdmin } from "./books";
import { requireAdmin } from "./session";

/**
 * Everything the Overview needs in one read, shaped around two questions:
 * "how is the store doing?" (the period vs the one before) and
 * "what needs me?" (a short list ranked by urgency).
 */

const DAY = 86400_000;
const LAGOS = 3600_000;
const dayKey = (t: number) => new Date(t + LAGOS).toISOString().slice(0, 10);

export type Attention = { id: string; tone: "urgent" | "soon" | "info"; title: string; detail: string; href: string; action: string };
export type Activity = { id: string; kind: "order" | "enquiry"; title: string; detail: string; at: string; href: string; status: string };

export async function getWorkspace(days: number) {
  await requireAdmin();
  const c = db();
  if (!c) throw new Error("Supabase is not configured");
  const now = Date.now();
  const start = now - days * DAY;
  const prevStart = start - days * DAY;

  const [paid, events, enquiries, stuck, recentOrders, books, { settings }] = await Promise.all([
    c.from("orders").select("amount_minor, currency, paid_at").eq("status", "paid").gte("paid_at", new Date(prevStart).toISOString()).limit(5000),
    c.from("events").select("sid, created_at").in("event", ["store_view", "book_view"]).gte("created_at", new Date(prevStart).toISOString()).limit(20000),
    c.from("enquiries").select("id, name, practice, status, created_at").order("created_at", { ascending: false }).limit(40),
    // paid, but the download email never went out (older than 10 minutes, so not mid-flight)
    c.from("orders").select("id, reference, name, created_at").eq("status", "paid").is("delivered_at", null).lt("paid_at", new Date(now - 10 * 60_000).toISOString()).limit(10),
    c.from("orders").select("id, reference, name, amount_minor, currency, status, created_at, meta").neq("status", "pending").order("created_at", { ascending: false }).limit(8),
    listBooksAdmin(),
    loadSettings(),
  ]);

  // ── the period vs the one before ──
  const series = Array.from({ length: days }, (_, i) => ({ day: dayKey(start + (i + 1) * DAY), ngn: 0, usd: 0, orders: 0, visits: new Set<string>() }));
  const idx = new Map(series.map((d, i) => [d.day, i]));
  const prev = { ngn: 0, usd: 0, orders: 0, visits: new Set<string>() };
  const cur = { ngn: 0, usd: 0, orders: 0, visits: new Set<string>() };
  for (const o of paid.data ?? []) {
    const t = Date.parse(o.paid_at);
    const bucket = t >= start ? cur : prev;
    if (o.currency === "USD") bucket.usd += o.amount_minor / 100;
    else bucket.ngn += o.amount_minor / 100;
    bucket.orders++;
    const i = t >= start ? idx.get(dayKey(t)) : undefined;
    if (i !== undefined) {
      if (o.currency === "USD") series[i].usd += o.amount_minor / 100;
      else series[i].ngn += o.amount_minor / 100;
      series[i].orders++;
    }
  }
  for (const e of events.data ?? []) {
    const t = Date.parse(e.created_at);
    (t >= start ? cur : prev).visits.add(e.sid);
    const i = t >= start ? idx.get(dayKey(t)) : undefined;
    if (i !== undefined) series[i].visits.add(e.sid);
  }
  const change = (a: number, b: number) => (b > 0 ? (a - b) / b : a > 0 ? null : 0); // null = "new" (nothing before)

  // ── what needs her, most urgent first ──
  const attention: Attention[] = [];
  for (const o of stuck.data ?? []) {
    attention.push({ id: `d-${o.id}`, tone: "urgent", title: `${o.name} hasn't received their book`, detail: "Paid, but the download email didn't go out.", href: `/admin/orders?q=${encodeURIComponent(o.reference)}`, action: "Resend" });
  }
  const waiting = (enquiries.data ?? []).filter((e) => e.status === "new").sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const e of waiting.slice(0, 4)) {
    const hours = Math.round((now - Date.parse(e.created_at)) / 3600_000);
    attention.push({
      id: `e-${e.id}`,
      tone: hours >= 24 ? "urgent" : "soon",
      title: `Reply to ${e.name}`,
      detail: `${e.practice} · waiting ${hours < 1 ? "under an hour" : hours < 48 ? `${hours} h` : `${Math.round(hours / 24)} days`}`,
      href: "/admin/enquiries",
      action: "Reply",
    });
  }
  for (const b of books.books.filter((x) => x.book.status === "published" && !x.file)) {
    attention.push({ id: `f-${b.book.slug}`, tone: "urgent", title: `Upload the file for ${b.book.title}`, detail: "It's on sale, but buyers would have nothing to download.", href: `/admin/books/${b.book.slug}`, action: "Upload" });
  }
  if (!settings.store.open) {
    attention.push({ id: "store", tone: "info", title: "The bookstore is paused", detail: settings.store.closedMessage || "Nobody can buy until you reopen it.", href: "/admin/settings", action: "Reopen" });
  }
  if (!process.env.RESEND_API_KEY) {
    attention.push({ id: "email", tone: "info", title: "Delivery emails aren't switched on yet", detail: "Your developer connects them once the firm's domain is set up.", href: "/admin/settings", action: "Status" });
  }

  // ── recent activity: orders and enquiries, newest first ──
  const activity: Activity[] = [
    ...(recentOrders.data ?? []).map((o) => ({
      id: `o-${o.id}`,
      kind: "order" as const,
      title: o.name,
      detail: String((o.meta as Record<string, unknown>)?.title ?? "Book order"),
      at: o.created_at,
      href: `/admin/orders?q=${encodeURIComponent(o.reference)}`,
      status: o.status,
      amount: { minor: o.amount_minor, currency: o.currency as "NGN" | "USD" },
    })),
    ...(enquiries.data ?? []).slice(0, 8).map((e) => ({
      id: `q-${e.id}`,
      kind: "enquiry" as const,
      title: e.name,
      detail: e.practice,
      at: e.created_at,
      href: "/admin/enquiries",
      status: e.status,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  const conversion = cur.visits.size ? cur.orders / cur.visits.size : 0;
  const prevConversion = prev.visits.size ? prev.orders / prev.visits.size : 0;

  return {
    days,
    revenue: { ngn: cur.ngn, usd: cur.usd, change: change(cur.ngn, prev.ngn) },
    orders: { value: cur.orders, change: change(cur.orders, prev.orders) },
    visits: { value: cur.visits.size, change: change(cur.visits.size, prev.visits.size) },
    conversion: { value: conversion, change: prevConversion ? (conversion - prevConversion) / prevConversion : null },
    enquiries: { waiting: waiting.length },
    series: series.map((d) => ({ day: d.day, ngn: d.ngn, orders: d.orders, visits: d.visits.size })),
    attention: attention.slice(0, 6),
    attentionTotal: attention.length,
    activity: activity as (Activity & { amount?: { minor: number; currency: "NGN" | "USD" } })[],
  };
}
