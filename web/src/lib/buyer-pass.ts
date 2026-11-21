import "server-only";
import { cookies } from "next/headers";
import { sign, unsign } from "@/lib/admin/session";

/**
 * "This browser started this purchase." A signed, httpOnly cookie set when
 * checkout begins, holding the buyer's last few order references. It lets the
 * thank-you page hand over the book instantly, without making the reference in
 * the URL a key: a shared or leaked confirmation link can't download anything.
 */
const COOKIE = "nl_buy";
const DAYS = 7;
const KEEP = 5;

type Pass = { refs: string[]; exp: number };

export async function grantBuyerPass(ref: string) {
  const jar = await cookies();
  const current = unsign<Pass>(jar.get(COOKIE)?.value)?.refs ?? [];
  const refs = [ref, ...current.filter((r) => r !== ref)].slice(0, KEEP);
  jar.set(COOKIE, sign({ refs, exp: Date.now() + DAYS * 86400_000 }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // lax: the buyer comes back from Paystack with a normal top-level link
    sameSite: "lax",
    path: "/",
    maxAge: DAYS * 86400,
  });
}

export async function hasBuyerPass(ref: string) {
  const pass = unsign<Pass>((await cookies()).get(COOKIE)?.value);
  return Boolean(pass?.refs.includes(ref));
}
