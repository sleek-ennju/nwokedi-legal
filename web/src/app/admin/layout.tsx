import type { Metadata, Viewport } from "next";
import "./admin.css";
import "./admin-books.css";
import "./admin-workspace.css";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · Nwokedi Legal" },
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = { themeColor: "#16253D", colorScheme: "light" };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="admin">{children}</div>;
}

/** Admin screens read the session and live data on every request, so they block rather than prerender. */
export const instant = false;
