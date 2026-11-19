import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** 256-bit random download token, URL-safe. Only its hash is ever stored. */
export const newToken = () => randomBytes(32).toString("base64url");

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Constant-time comparison of two hex strings (avoids timing leaks on signature checks). */
export function safeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ab.length === bb.length && ab.length > 0 && timingSafeEqual(ab, bb);
}

/** Paystack signs each webhook body with HMAC-SHA512 using the secret key (header: x-paystack-signature). */
export function validPaystackSignature(rawBody: string, signature: string | null) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
