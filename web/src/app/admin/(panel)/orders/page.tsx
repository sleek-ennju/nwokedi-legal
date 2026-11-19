import type { Metadata } from "next";
import Link from "next/link";
import OrderActions from "@/components/admin/OrderActions";
import { ORDER_STATUSES, listOrders } from "@/lib/admin/data";
import { money, when } from "@/lib/admin/format";
import { getAllBooks } from "@/lib/books/catalog";

export const metadata: Metadata = { title: "Orders" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const sp = await searchParams;
  const q = one(sp.q);
  const status = one(sp.status);
  const page = Number(one(sp.page)) || 1;
  const [{ orders, total, pages }, books] = await Promise.all([listOrders({ q, status, page }), getAllBooks()]);
  const title = (slug: string) => books.find((b) => b.slug === slug)?.title ?? slug;
  const href = (o: Record<string, string | number>) => {
    const p = new URLSearchParams({ ...(q && { q }), ...(status && { status }), ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    return `/admin/orders${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <header className="a-head">
        <div>
          <h1>Orders</h1>
          <p>Every checkout, paid or not. Resend a download link or record a refund.</p>
        </div>
      </header>

      <div className="a-toolbar">
        <form role="search">
          {status && <input type="hidden" name="status" value={status} />}
          <label className="sr-only" htmlFor="q">
            Search orders
          </label>
          <input id="q" className="a-input" name="q" type="search" placeholder="Email, name or reference" defaultValue={q} />
          <button className="a-btn">Search</button>
        </form>
        <nav className="a-tabs" aria-label="Filter by status">
          <Link href={href({ status: "", page: "" })} aria-current={!status ? "page" : undefined}>
            All
          </Link>
          {ORDER_STATUSES.map((s) => (
            <Link key={s} href={href({ status: s, page: "" })} aria-current={status === s ? "page" : undefined}>
              {s[0].toUpperCase() + s.slice(1)}
            </Link>
          ))}
        </nav>
      </div>

      <section className="a-card">
        {orders.length ? (
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Buyer</th>
                  <th>Book</th>
                  <th>Status</th>
                  <th className="num">Amount</th>
                  <th>Downloads</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      {o.name}
                      <div className="a-small a-mute">{o.email}</div>
                      <div className="a-small a-mute a-nowrap">
                        {o.reference} · {when(o.created_at)}
                      </div>
                    </td>
                    <td className="a-small">{title(o.book_slug)}</td>
                    <td>
                      <span className={`a-pill a-pill--${o.status}`}>{o.status}</span>
                      {o.meta?.mock === true && <div className="a-small a-mute">test</div>}
                    </td>
                    <td className="num">{money(o.amount_minor / 100, o.currency)}</td>
                    <td className="a-small a-nowrap">
                      {o.links.count ? (
                        <>
                          {o.links.uses} of {o.links.maxUses} used
                          <div className="a-mute">
                            {o.links.count > 1 ? `${o.links.count} links · ` : ""}
                            {o.links.live ? `valid to ${when(o.links.expiresAt)}` : "no active link"}
                          </div>
                        </>
                      ) : (
                        <span className="a-mute">—</span>
                      )}
                    </td>
                    <td>
                      <OrderActions id={o.id} canAct={o.status === "paid"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="a-empty">{q || status ? "No orders match that search." : "No orders yet."}</p>
        )}
        {pages > 1 && (
          <div className="a-pager">
            <span>
              Page {page} of {pages} · {total} orders
            </span>
            <span className="a-actions">
              {page > 1 && (
                <Link className="a-btn a-btn--ghost a-btn--sm" href={href({ page: page - 1 })}>
                  ← Newer
                </Link>
              )}
              {page < pages && (
                <Link className="a-btn a-btn--ghost a-btn--sm" href={href({ page: page + 1 })}>
                  Older →
                </Link>
              )}
            </span>
          </div>
        )}
      </section>
    </>
  );
}

/** Admin screens read the session and live data on every request, so they block rather than prerender. */
export const instant = false;
