import type { Metadata } from "next";
import Link from "next/link";
import { computeAnalytics } from "@/lib/admin/analytics";
import { getAnalyticsData } from "@/lib/admin/data";
import { day, moneyPair, pct } from "@/lib/admin/format";
import { getAllBooks } from "@/lib/books/catalog";

export const metadata: Metadata = { title: "Store analytics" };

const RANGES = [7, 30, 90] as const;

export default async function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  const raw = (await searchParams).days;
  const days = RANGES.find((r) => String(r) === (Array.isArray(raw) ? raw[0] : raw)) ?? 30;
  const [{ events, orders }, books] = await Promise.all([getAnalyticsData(days), getAllBooks()]);
  const a = computeAnalytics(events, orders as Parameters<typeof computeAnalytics>[1], days);
  const title = (slug: string) => books.find((b) => b.slug === slug)?.title ?? slug;
  const top = a.funnel[0].count || 1;
  const peak = Math.max(1, ...a.daily.map((d) => d.visits));

  return (
    <>
      <header className="a-head">
        <div>
          <h1>Store analytics</h1>
          <p>How visitors move from the bookstore to a purchase. Anonymous and cookie-free, so each figure counts visits, not people.</p>
        </div>
        <nav className="a-tabs" aria-label="Date range">
          {RANGES.map((r) => (
            <Link key={r} href={`/admin/analytics?days=${r}`} aria-current={r === days ? "page" : undefined}>
              {r} days
            </Link>
          ))}
        </nav>
      </header>

      {a.visits === 0 ? (
        <section className="a-card">
          <p className="a-empty">No store visits in the last {days} days yet. Numbers appear here as soon as people browse the bookstore.</p>
        </section>
      ) : (
        <>
          <div className="a-grid a-grid--2">
            <section className="a-card">
              <h2>Where buyers drop off</h2>
              <p className="a-card__sub">Each step as a share of store visits.</p>
              <div className="a-funnel">
                {a.funnel.map((f, i) => (
                  <div className="a-funnel__row" key={f.key}>
                    <span>{f.label}</span>
                    <div className="a-bar" role="img" aria-label={`${f.count} visits, ${pct(f.count / top)}`}>
                      <i style={{ width: `${(f.count / top) * 100}%` }} />
                    </div>
                    <span className="a-funnel__val">
                      {f.count}
                      <small>{i === 0 ? "visits" : pct(f.count / top)}</small>
                    </span>
                  </div>
                ))}
              </div>
              <p className="a-note">
                {a.medianMinutesToPurchase !== null
                  ? `Buyers typically pay ${fmtMinutes(a.medianMinutesToPurchase)} after arriving.`
                  : "No purchases in this period yet."}
              </p>
            </section>

            <section className="a-card">
              <h2>Visits per day</h2>
              <p className="a-card__sub">Bronze marks days with a sale.</p>
              <div className="a-spark" role="img" aria-label={`Daily store visits over the last ${days} days, peaking at ${peak}`}>
                {a.daily.map((d) => (
                  <span key={d.day} data-paid={d.paid > 0} style={{ height: `${Math.max(2, (d.visits / peak) * 100)}%` }} title={`${d.day}: ${d.visits} visits${d.paid ? `, ${d.paid} sold` : ""}`} />
                ))}
              </div>
              <div className="a-spark__axis">
                <span>{day(a.daily[0].day)}</span>
                <span>peak {peak}</span>
                <span>{day(a.daily.at(-1)!.day)}</span>
              </div>
            </section>
          </div>

          <section className="a-card a-section">
            <h2>Books</h2>
            <p className="a-card__sub">Which book converts best, and which page needs work.</p>
            <div className="a-table-wrap">
              <table className="a-table">
                <thead>
                  <tr>
                    <th>Book</th>
                    <th className="num">Page views</th>
                    <th className="num">Read sample</th>
                    <th className="num">Checkouts</th>
                    <th className="num">Sold</th>
                    <th className="num">Conversion</th>
                    <th className="num">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {a.books.map((b) => (
                    <tr key={b.slug}>
                      <td>{title(b.slug)}</td>
                      <td className="num">{b.views}</td>
                      <td className="num">{b.samples}</td>
                      <td className="num">{b.checkouts}</td>
                      <td className="num">{b.paid}</td>
                      <td className="num">{b.conversion === null ? "—" : pct(b.conversion)}</td>
                      <td className="num">{moneyPair(b.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="a-grid a-grid--2 a-section">
            <section className="a-card">
              <h2>Does the sample sell the book?</h2>
              <p className="a-card__sub">Purchase rate of visitors who read the sample against those who didn&rsquo;t.</p>
              <div className="a-compare">
                <div>
                  <strong>{pct(a.sample.readerBuyRate)}</strong>
                  <span className="a-small a-mute">of {a.sample.readers} sample readers bought</span>
                </div>
                <div>
                  <strong>{pct(a.sample.nonReaderBuyRate)}</strong>
                  <span className="a-small a-mute">of {a.sample.nonReaders} who skipped it bought</span>
                </div>
              </div>
              {a.sample.depth.length > 0 && (
                <div className="a-funnel">
                  {a.sample.depth.map((d) => (
                    <div className="a-funnel__row" key={d.page}>
                      <span>Reached page {d.page}</span>
                      <div className="a-bar" role="img" aria-label={`${d.readers} readers`}>
                        <i style={{ width: `${(d.readers / Math.max(1, a.sample.readers)) * 100}%` }} />
                      </div>
                      <span className="a-funnel__val">{d.readers}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="a-card">
              <h2>Where visitors come from</h2>
              <p className="a-card__sub">The site that sent them, or the campaign tag (utm_source) on the link.</p>
              <Breakdown rows={a.sources.slice(0, 8)} />
            </section>
          </div>

          <div className="a-grid a-grid--2 a-section">
            <section className="a-card">
              <h2>Phone or computer</h2>
              <p className="a-card__sub">Make sure the experience that sells is the one people use.</p>
              <Breakdown rows={a.devices.map((d) => ({ ...d, name: d.name === "mobile" ? "Phone / tablet" : d.name === "desktop" ? "Computer" : "Unknown" }))} />
            </section>
            <section className="a-card">
              <h2>Checkout</h2>
              <p className="a-card__sub">Orders started against orders paid.</p>
              <div className="a-compare">
                <div>
                  <strong>{a.checkout.ordersPaid}</strong>
                  <span className="a-small a-mute">paid of {a.checkout.ordersCreated} started</span>
                </div>
                <div>
                  <strong>{pct(a.checkout.abandonRate)}</strong>
                  <span className="a-small a-mute">left at payment</span>
                </div>
              </div>
              <p className="a-note">
                Checkouts opened in ₦: {a.checkout.startedCurrency.NGN ?? 0} · in $: {a.checkout.startedCurrency.USD ?? 0}
              </p>
            </section>
          </div>
        </>
      )}
    </>
  );
}

function Breakdown({ rows }: { rows: { name: string; visits: number; paid: number; conversion: number }[] }) {
  return (
    <div className="a-table-wrap">
      <table className="a-table">
        <thead>
          <tr>
            <th>Source</th>
            <th className="num">Visits</th>
            <th className="num">Bought</th>
            <th className="num">Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td className="num">{r.visits}</td>
              <td className="num">{r.paid}</td>
              <td className="num">{pct(r.conversion)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmtMinutes(m: number) {
  if (m < 1) return "within a minute";
  if (m < 60) return `about ${Math.round(m)} minutes`;
  if (m < 48 * 60) return `about ${Math.round(m / 60)} hours`;
  return `about ${Math.round(m / 1440)} days`;
}

/** Admin screens read the session and live data on every request, so they block rather than prerender. */
export const instant = false;
