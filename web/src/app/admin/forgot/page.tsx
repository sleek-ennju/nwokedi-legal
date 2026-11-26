import type { Metadata } from "next";
import ForgotForm from "@/components/admin/ForgotForm";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPage() {
  return (
    <main className="a-login">
      <div className="a-login__stack">
        <div className="a-login__mark">
          {/* eslint-disable-next-line @next/next/no-img-element -- vector brand mark */}
          <img src="/brand/lockup.svg" alt="Nwokedi Legal" width={248} height={43} />
        </div>
        <div className="a-login__card">
          <ForgotForm />
        </div>
        <p className="a-login__foot">Private dashboard · authorised staff only</p>
      </div>
    </main>
  );
}

export const instant = false;
