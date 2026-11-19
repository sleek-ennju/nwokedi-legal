import { validPaystackSignature } from "@/lib/crypto/tokens";
import { fulfilOrder } from "@/lib/fulfil";

/**
 * Paystack → us. Set this URL in Paystack: Settings → API Keys & Webhooks →
 * Webhook URL = https://<domain>/api/paystack/webhook
 *
 * Security: the raw body must carry a valid HMAC-SHA512 signature from our
 * secret key; then fulfilOrder() re-verifies the transaction with Paystack's
 * API anyway, so a forged or replayed event can never deliver a book.
 * Always answers 200 quickly once the signature is valid (Paystack retries otherwise).
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!validPaystackSignature(raw, req.headers.get("x-paystack-signature"))) {
    return new Response("invalid signature", { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const ref = event.data?.reference;
  if (event.event === "charge.success" && ref) {
    const origin = new URL(req.url).origin;
    const r = await fulfilOrder(ref, { origin });
    if (r.state === "error") {
      console.error("[webhook] fulfil error", ref, r.reason);
      // 500 → Paystack retries later, which re-runs the idempotent fulfilment
      if (r.reason === "delivery failed") return new Response("retry", { status: 500 });
    }
  }
  return new Response("ok", { status: 200 });
}
