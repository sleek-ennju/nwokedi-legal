import "server-only";

/**
 * Paystack adapter (server only). Initialises a hosted checkout and verifies
 * a transaction. Docs: https://paystack.com/docs/api/transaction/
 * The secret key never reaches the browser.
 */
const API = "https://api.paystack.co";
const key = () => process.env.PAYSTACK_SECRET_KEY ?? "";
export const paystackConfigured = () => key().length > 0;

type InitInput = {
  email: string;
  amountMinor: number;
  currency: "NGN" | "USD";
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
};

export async function initialize(i: InitInput): Promise<{ url: string } | { error: string }> {
  const res = await fetch(`${API}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: i.email,
      amount: i.amountMinor,
      currency: i.currency,
      reference: i.reference,
      callback_url: i.callbackUrl,
      metadata: i.metadata,
      channels: ["card", "bank", "ussd", "bank_transfer"],
    }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: { authorization_url?: string } };
  if (!res.ok || !data.status || !data.data?.authorization_url) {
    console.error("[paystack] initialize failed", res.status, data.message);
    return { error: "We couldn't start the payment. Please try again in a moment." };
  }
  return { url: data.data.authorization_url };
}

export type Verified = {
  status: "success" | "failed" | "abandoned" | "pending" | string;
  amountMinor: number;
  currency: string;
  email: string;
  metadata: Record<string, unknown>;
};

export async function verify(reference: string): Promise<Verified | null> {
  const res = await fetch(`${API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${key()}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    data?: { status: string; amount: number; currency: string; customer?: { email: string }; metadata?: Record<string, unknown> };
  };
  if (!data.data) return null;
  return {
    status: data.data.status,
    amountMinor: data.data.amount,
    currency: data.data.currency,
    email: data.data.customer?.email ?? "",
    metadata: data.data.metadata ?? {},
  };
}
