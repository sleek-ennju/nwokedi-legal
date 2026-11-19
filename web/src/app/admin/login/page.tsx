import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { getAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="a-login">
      <div className="a-login__card">
        <div className="a-brand">
          <span className="a-brand__mark" aria-hidden="true">
            N
          </span>
          <span className="a-brand__name">
            Nwokedi Legal
            <small>Admin</small>
          </span>
        </div>
        <LoginForm />
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
