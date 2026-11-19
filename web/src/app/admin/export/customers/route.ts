import { listCustomers } from "@/lib/admin/data";
import { getAdmin } from "@/lib/admin/session";
import { getAllBooks } from "@/lib/books/catalog";

/** CSV of paying customers. Admin-only; never cached. */
export async function GET() {
  if (!(await getAdmin())) return new Response("Not found", { status: 404 });
  const [customers, books] = await Promise.all([listCustomers(), getAllBooks()]);
  const title = (slug: string) => books.find((b) => b.slug === slug)?.title ?? slug;

  // quote every cell, and defuse spreadsheet formulas (=, +, -, @) in user-entered text
  const cell = (v: string | number) => {
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const rows = [
    ["Name", "Email", "Books", "Orders", "Spent NGN", "Spent USD", "First purchase", "Last purchase"],
    ...customers.map((c) => [c.name, c.email, c.books.map(title).join("; "), c.orders, c.spent.NGN, c.spent.USD, c.first.slice(0, 10), c.last.slice(0, 10)]),
  ];
  const csv = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nwokedi-legal-customers-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
