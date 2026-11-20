import type { Metadata } from "next";
import Link from "next/link";
import { Sparkline, TrendAxis, TrendChart } from "@/components/admin/Charts";
import { money, pct, when } from "@/lib/admin/format";
import { getAdmin } from "@/lib/admin/session";
import { getWorkspace } from "@/lib/admin/workspace";

export const metadata: Metadata = { title: "Overview" };

const RANGES = [7, 30, 90] as const;

function greeting(now = new Date()) {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Lagos" }).format(now));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** "+18% vs previous 30 days" — always says what it's compared with. */
function Delta({ change, days }: { change: number | null; days: number }) {
  if (change === null) return <span className="ws-delta ws-delta--up">New this period</span>;
  if (Math.abs(change) < 0.005) return <span className="ws-delta">No change vs previous {days} days</span>;
  const up = change > 0;
  return (
    <span className={`ws-delta ${up ? "ws-delta--up" : "ws-delta--down"}`}>
      <span aria-hidden="true">{up ? "↑" : "↓"}</span> {pct(Math.abs(change))} <span className="ws-delta__vs">vs previous {days} days</span>
    </span>
  );
}

export default async function Overview({ searchParams }: PageProps<"/admin">) {
  const raw = (await searchParams).days;
  const days = RANGES.find((r) => String(r) === (Array.isArray(raw) ? raw[0] : raw)) ?? 30;
  const [w, admin] = await Promise.all([getWorkspace(days), getAdmin()]);
  const first = admin?.name?.split(/\s+/)[0];

  const kpis = [
    { label: "Orders", value: String(w.orders.value), change: w.orders.change, href: "/admin/orders?status=paid", spark: w.series.map((d) => d.orders) },
    { label: "Store visits", value: String(w.visits.value), change: w.visits.change, href: "/admin/analytics", spark: w.series.map((d) => d.visits) },
    { label: "Visit → purchase", value: pct(w.conversion.value), change: w.conversion.change, href: "/admin/analytics", spark: null },
    { label: "Enquiries waiting", value: String(w.enquiries.waiting), change: undefined, href: "/admin/enquiries", spark: null },
  ];

  return (
    <>
      <header className="ws-head">
        <div>
          <h1>
            {greeting()}
            {first ? `, ${first}` : ""}.
          </h1>
          <p>
            {w.attentionTotal === 0
              ? "Everything is in order. Here's how the bookstore is doing."
              : `${w.attentionTotal} ${w.attentionTotal === 1 ? "thing needs" : "things need"} you today. Here's how the bookstore is doing.`}
          </p>
        </div>
        <nav className="a-tabs" aria-label="Period">
          {RANGES.map((r) => (
            <Link key={r} href={r === 30 ? "/admin" : `/admin?days=${r}`} aria-current={r === days ? "page" : undefined}>
              {r} days
            </Link>
          ))}
        </nav>
      </header>

      <div className="ws-top">
        <section className="a-card ws-hero" aria-labelledby="ws-sales">
          <div className="ws-hero__head">
            <h2 id="ws-sales" className="ws-label">
              Book sales · last {days} days
            </h2>
            <Delta change={w.revenue.change} days={days} />
          </div>
          <p className="ws-hero__value">
            {money(w.revenue.ngn, "NGN")}
            {w.revenue.usd > 0 && <span className="ws-hero__usd"> + {money(w.revenue.usd, "USD")}</span>}
          </p>
          <TrendChart
            ariaLabel={`Daily book sales over the last ${days} days, totalling ${money(w.revenue.ngn, "NGN")}`}
            points={w.series.map((d) => ({ day: d.day, value: d.ngn, label: `${money(d.ngn, "NGN")} · ${d.orders} ${d.orders === 1 ? "order" : "orders"}` }))}
          />
          {w.series.length > 1 && <TrendAxis from={w.series[0].day} to={w.series[w.series.length - 1].day} />}
        </section>

        <section className="a-card ws-attn" aria-labelledby="ws-attn">
          <div className="ws-attn__head">
            <h2 id="ws-attn">Needs your attention</h2>
            {w.attentionTotal > 0 && <span className="ws-count">{w.attentionTotal}</span>}
          </div>
          {w.attention.length ? (
            <ul className="ws-attn__list">
              {w.attention.map((a) => (
                <li key={a.id} className={`ws-item ws-item--${a.tone}`}>
                  <span className="ws-item__dot" aria-hidden="true" />
                  <span className="ws-item__text">
                    <strong>{a.title}</strong>
                    <span>{a.detail}</span>
                  </span>
                  <Link className="a-btn a-btn--ghost a-btn--sm" href={a.href}>
                    {a.action}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="ws-clear">
              <strong>All clear.</strong>
              <span>No enquiries waiting and every buyer has their book.</span>
            </div>
          )}
        </section>
      </div>

      <div className="ws-kpis">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="a-card ws-kpi">
            <span className="ws-label">{k.label}</span>
            <span className="ws-kpi__value">{k.value}</span>
            <span className="ws-kpi__foot">
              {k.change !== undefined ? <Delta change={k.change} days={days} /> : <span className="ws-delta">{k.value === "0" ? "None waiting" : "Oldest first in Enquiries"}</span>}
              {k.spark && <Sparkline values={k.spark} ariaLabel={`${k.label} per day`} />}
            </span>
          </Link>
        ))}
      </div>

      <section className="a-card a-section" aria-labelledby="ws-activity">
        <div className="a-card__head">
          <h2 id="ws-activity">Recent activity</h2>
          <Link href="/admin/orders">All orders →</Link>
        </div>
        {w.activity.length ? (
          <ul className="ws-feed">
            {w.activity.map((a) => (
              <li key={a.id}>
                <Link href={a.href} className="ws-feed__row">
                  <span className={`ws-feed__kind ws-feed__kind--${a.kind}`}>{a.kind === "order" ? "Order" : "Enquiry"}</span>
                  <span className="ws-feed__main">
                    <strong>{a.title}</strong>
                    <span>{a.detail}</span>
                  </span>
                  <span className={`a-pill a-pill--${a.status}`}>{a.status}</span>
                  <span className="ws-feed__amt">{a.amount ? money(a.amount.minor / 100, a.amount.currency) : ""}</span>
                  <span className="ws-feed__time">{when(a.at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="a-empty">
            Nothing yet. When someone buys a book or sends an enquiry, it appears here. <Link href="/books">Your bookstore is live at /books</Link>.
          </p>
        )}
      </section>
    </>
  );
}

/** Admin screens read the session and live data on every request, so they block rather than prerender. */
export const instant = false;
