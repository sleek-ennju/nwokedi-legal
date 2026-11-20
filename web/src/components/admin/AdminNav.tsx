"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import AdminIcon, { type IconName } from "./AdminIcon";

const LINKS: [string, string, IconName][] = [
  ["/admin", "Overview", "overview"],
  ["/admin/orders", "Orders", "orders"],
  ["/admin/books", "Books", "books"],
  ["/admin/articles", "Articles", "articles"],
  ["/admin/analytics", "Store analytics", "analytics"],
  ["/admin/customers", "Customers", "customers"],
  ["/admin/enquiries", "Enquiries", "enquiries"],
  ["/admin/settings", "Settings", "settings"],
];

/** The active section is "lit": torch-gold light falls on it, as the lamp does on the site. */
export default function AdminNav({ badges }: { badges?: Partial<Record<string, ReactNode>> }) {
  const path = usePathname();
  const active = (href: string) => (href === "/admin" ? path === href : path === href || path.startsWith(`${href}/`));
  return (
    <nav className="a-nav" aria-label="Admin">
      {LINKS.map(([href, label, icon]) => (
        <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}>
          <AdminIcon name={icon} />
          <span className="a-nav__label">{label}</span>
          {badges?.[href]}
        </Link>
      ))}
    </nav>
  );
}
