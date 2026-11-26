import type { Metadata } from "next";
import { Suspense } from "react";
import ResetForm from "@/components/admin/ResetForm";

// the link carries a one-time token: never send it on to another site
export const metadata: Metadata = { title: "Choose a new password", referrer: "no-referrer" };

export default function ResetPage({ searchParams }: PageProps<"/admin/reset">) {
  return (
    <main className="a-login">
      <div className="a-login__stack">
        <div className="a-login__mark">
          {/* eslint-disable-next-line @next/next/no-img-element -- vector brand mark */}
          <img src="/brand/lockup.svg" alt="Nwokedi Legal" width={248} height={43} />
        </div>
        <div className="a-login__card">
          <Suspense>
            <WithToken searchParams={searchParams} />
          </Suspense>
        </div>
        <p className="a-login__foot">Private dashboard · authorised staff only</p>
      </div>
    </main>
  );
}

async function WithToken({ searchParams }: Pick<PageProps<"/admin/reset">, "searchParams">) {
  const t = (await searchParams).t;
  return <ResetForm token={typeof t === "string" ? t : ""} />;
}

export const instant = false;
