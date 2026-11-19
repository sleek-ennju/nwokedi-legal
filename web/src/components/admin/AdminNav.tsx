"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const LINKS = [
  ["/admin", "Overview"],
  ["/admin/orders", "Orders"],
  ["/admin/books", "Books"],
  ["/admin/analytics", "Store analytics"],
  ["/admin/customers", "Customers"],
  ["/admin/enquiries", "Enquiries"],
  ["/admin/settings", "Settings"],
] as const;

export default function AdminNav({ badges }: { badges?: Partial<Record<string, ReactNode>> }) {
  const path = usePathname();
  const active = (href: string) => (href === "/admin" ? path === href : path === href || path.startsWith(`${href}/`));
  return (
    <nav className="a-nav" aria-label="Admin">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}>
          {label}
          {badges?.[href]}
        </Link>
      ))}
    </nav>
  );
}
