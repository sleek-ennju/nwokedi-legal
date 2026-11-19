import type { Metadata } from "next";
import { listCustomers } from "@/lib/admin/data";
import { day, moneyPair } from "@/lib/admin/format";
import { getAllBooks } from "@/lib/books/catalog";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage() {
  const [customers, books] = await Promise.all([listCustomers(), getAllBooks()]);
  const title = (slug: string) => books.find((b) => b.slug === slug)?.title ?? slug;

  return (
    <>
      <header className="a-head">
        <div>
          <h1>Customers</h1>
          <p>Everyone who has bought a book. Only email people who agreed to hear from you.</p>
        </div>
        {customers.length > 0 && (
          <a className="a-btn a-btn--ghost" href="/admin/export/customers" download>
            Download CSV
          </a>
        )}
      </header>

      <section className="a-card">
        {customers.length ? (
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Books</th>
                  <th className="num">Orders</th>
                  <th className="num">Spent</th>
                  <th className="num">Last purchase</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.email}>
                    <td>
                      {c.name}
                      <div className="a-small a-mute">{c.email}</div>
                    </td>
                    <td className="a-small">{c.books.map(title).join(", ")}</td>
                    <td className="num">{c.orders}</td>
                    <td className="num">{moneyPair(c.spent)}</td>
                    <td className="num a-small a-mute">{day(c.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="a-empty">No customers yet.</p>
        )}
      </section>
    </>
  );
}

/** Admin screens read the session and live data on every request, so they block rather than prerender. */
export const instant = false;
