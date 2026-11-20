import Link from "next/link";
import { Suspense } from "react";
import AdminIcon from "@/components/admin/AdminIcon";
import AdminNav from "@/components/admin/AdminNav";
import { signOut } from "../actions/auth";
import { getAdmin, requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/db/supabase";

/** Static chrome renders instantly; everything that reads the session streams in behind Suspense. */
export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="a-shell">
      <aside className="a-side">
        <Link href="/admin" className="a-brand" aria-label="Nwokedi Legal admin — overview">
          {/* eslint-disable-next-line @next/next/no-img-element -- vector brand mark */}
          <img className="a-brand__lockup" src="/brand/lockup.svg" alt="" width={176} height={31} />
          {/* eslint-disable-next-line @next/next/no-img-element -- vector brand mark */}
          <img className="a-brand__emblem" src="/brand/emblem.svg" alt="" width={26} height={34} />
          <span className="a-brand__tag">Admin</span>
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
          <a className="a-side__link" href="/" target="_blank" rel="noreferrer">
            <AdminIcon name="external" size={16} />
            <span>View the site</span>
          </a>
          <form action={signOut}>
            <button className="a-side__link" type="submit">
              <AdminIcon name="signout" size={16} />
              <span>Sign out</span>
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
  return admin ? <span className="a-side__who">{admin.email}</span> : null;
}

async function NewEnquiries() {
  if (!(await getAdmin())) return null;
  const { count } = (await db()?.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new")) ?? {};
  return count ? <span className="a-nav__badge">{count}</span> : null;
}

/** Admin screens read the session and live data on every request, so they block rather than prerender. */
export const instant = false;
