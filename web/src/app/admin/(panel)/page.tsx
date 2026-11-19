import type { Metadata } from "next";
import Link from "next/link";
import { getOverview } from "@/lib/admin/data";
import { money, moneyPair, when } from "@/lib/admin/format";
import { getAllBooks } from "@/lib/books/catalog";

export const metadata: Metadata = { title: "Overview" };

export default async function Overview() {
  const [o, books] = await Promise.all([getOverview(), getAllBooks()]);
  const title = (slug: string) => books.find((b) => b.slug === slug)?.title ?? slug;

  return (
    <>
      <header className="a-head">
        <div>
          <h1>Overview</h1>
          <p>Sales, readers and enquiries at a glance. Times are Lagos time.</p>
        </div>
      </header>

      <div className="a-grid a-grid--stats">
        <Stat label="Today" value={moneyPair(o.today.money)} note={`${o.today.count} ${o.today.count === 1 ? "sale" : "sales"}`} />
        <Stat label="This month" value={moneyPair(o.month.money)} note={`${o.month.count} ${o.month.count === 1 ? "sale" : "sales"}`} />
        <Stat label="Store visitors" value={String(o.visitors30)} note="last 30 days" href="/admin/analytics" />
        <Stat
          label="New enquiries"
          value={String(o.newEnquiries)}
          note={o.newEnquiries ? "waiting for a reply" : "all caught up"}
          href="/admin/enquiries"
        />
      </div>

      <div className="a-grid a-grid--2 a-section">
        <section className="a-card">
          <div className="a-card__head">
            <h2>Recent orders</h2>
            <Link href="/admin/orders">All orders →</Link>
          </div>
          {o.recentOrders.length ? (
            <div className="a-table-wrap">
              <table className="a-table">
                <tbody>
                  {o.recentOrders.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {r.name}
                        <div className="a-small a-mute">{title(r.book_slug)}</div>
                      </td>
                      <td>
                        <span className={`a-pill a-pill--${r.status}`}>{r.status}</span>
                      </td>
                      <td className="num">
                        {money(r.amount_minor / 100, r.currency)}
                        <div className="a-small a-mute">{when(r.paid_at ?? (r as { created_at?: string }).created_at)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="a-empty">No orders yet. They&rsquo;ll appear here the moment someone buys.</p>
          )}
        </section>

        <section className="a-card">
          <div className="a-card__head">
            <h2>Latest enquiries</h2>
            <Link href="/admin/enquiries">All enquiries →</Link>
          </div>
          {o.recentEnquiries.length ? (
            <div className="a-table-wrap">
              <table className="a-table">
                <tbody>
                  {o.recentEnquiries.map((e) => (
                    <tr key={e.id}>
                      <td>
                        {e.name}
                        <div className="a-small a-mute">{e.practice}</div>
                      </td>
                      <td>
                        <span className={`a-pill a-pill--${e.status}`}>{e.status}</span>
                      </td>
                      <td className="num a-small a-mute">{when(e.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="a-empty">No consultation requests yet.</p>
          )}
        </section>
      </div>

      <div className="a-grid a-grid--stats a-section">
        <Stat label="All-time sales" value={moneyPair(o.total.money)} note={`${o.total.count} paid orders`} />
        <Stat
          label="Best seller"
          value={o.bestSeller ? String(o.bestSeller.sold) : "—"}
          note={o.bestSeller ? `copies of ${title(o.bestSeller.slug)}` : "no sales yet"}
        />
      </div>
    </>
  );
}

function Stat({ label, value, note, href }: { label: string; value: string; note?: string; href?: string }) {
  const body = (
    <>
      <div className="a-stat__label">{label}</div>
      <div className="a-stat__value">{value}</div>
      {note && <div className="a-stat__note">{note}</div>}
    </>
  );
  return href ? (
    <Link href={href} className="a-card" style={{ textDecoration: "none" }}>
      {body}
    </Link>
  ) : (
    <div className="a-card">{body}</div>
  );
}

/** Admin screens read the session and live data on every request, so they block rather than prerender. */
export const instant = false;
