import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { getAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="a-login">
      <div className="a-login__stack">
        <div className="a-login__mark">
          {/* eslint-disable-next-line @next/next/no-img-element -- vector brand mark */}
          <img src="/brand/lockup.svg" alt="Nwokedi Legal" width={248} height={43} />
        </div>
        <div className="a-login__card">
          <LoginForm />
        </div>
        <p className="a-login__foot">Private dashboard · authorised staff only</p>
      </div>
      <Suspense>
        <AlreadySignedIn />
      </Suspense>
    </main>
  );
}

async function AlreadySignedIn() {
  if (await getAdmin()) redirect("/admin");
  return null;
}

/** Admin screens read the session and live data on every request, so they block rather than prerender. */
export const instant = false;
