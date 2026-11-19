import Link from "next/link";
import { Suspense } from "react";
import AdminNav from "@/components/admin/AdminNav";
import { signOut } from "../actions/auth";
import { getAdmin, requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/db/supabase";

/** Static chrome renders instantly; everything that reads the session streams in behind Suspense. */
export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="a-shell">
      <aside className="a-side">
        <Link href="/admin" className="a-brand">
          <span className="a-brand__mark" aria-hidden="true">
            N
          </span>
          <span className="a-brand__name">
            Nwokedi Legal
            <small>Admin</small>
          </span>
        </Link>
        <AdminNav
          badges={{
            "/admin/enquiries": (
              <Suspense>
                <NewEnquiries />
              </Suspense>
            ),
          }}
        />
        <div className="a-side__foot">
          <Suspense>
            <Who />
          </Suspense>
          <a href="/" target="_blank" rel="noreferrer">
            View the site ↗
          </a>
          <form action={signOut}>
            <button className="a-linkbtn" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="a-main">
        <Suspense fallback={<p className="a-mute">Loading…</p>}>
          <Gate>{children}</Gate>
        </Suspense>
      </main>
    </div>
  );
}

async function Gate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}

async function Who() {
  const admin = await getAdmin();
  return admin ? <span>{admin.email}</span> : null;
}

async function NewEnquiries() {
  if (!(await getAdmin())) return null;
  const { count } = (await db()?.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new")) ?? {};
  return count ? <span className="a-nav__badge">{count}</span> : null;
}

/** Admin screens read the session and live data on every request, so they block rather than prerender. */
export const instant = false;
