import type { Money } from "./data";

const NGN = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export const money = (amount: number, currency: "NGN" | "USD") => (currency === "NGN" ? NGN : USD).format(amount);

/** "₦40,000 · $25" — only the currencies that have money in them */
export function moneyPair(m: Money) {
  const parts = [m.NGN || !m.USD ? money(m.NGN, "NGN") : null, m.USD ? money(m.USD, "USD") : null].filter(Boolean);
  return parts.join(" · ");
}

const DT = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const D = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });

export const when = (iso: string | null | undefined) => (iso ? DT.format(new Date(iso)) : "—");
export const day = (iso: string | null | undefined) => (iso ? D.format(new Date(iso)) : "—");
export const pct = (x: number) => `${(x * 100).toFixed(x > 0 && x < 0.1 ? 1 : 0)}%`;
