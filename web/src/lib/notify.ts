import "server-only";
import { db } from "@/lib/db/supabase";
import { sendMail } from "@/lib/email/send";
import { loadSettings } from "@/lib/settings";
import { site } from "@/lib/site";

/**
 * One place where things that deserve her attention are announced:
 *  1. a row in `notifications` → the bell + toast in her dashboard (always),
 *  2. an email alert → if Settings → Alerts has an address and that kind is on.
 * Never throws: a notification must never break a payment or an enquiry.
 */

export type NotificationKind = "order_paid" | "enquiry_new" | "delivery_failed" | "order_refunded";

type Notice = {
  kind: NotificationKind;
  title: string;
  body?: string;
  /** an /admin path the bell opens */
  href?: string;
  /** one notification per event: webhook retries won't repeat it */
  dedupe?: string;
  /** for the email: reply goes straight to the customer */
  replyTo?: string;
  /** extra lines for the email only (e.g. the full enquiry) */
  detail?: [string, string][];
  message?: string;
};

const KIND_PREF: Record<NotificationKind, "orders" | "enquiries" | "problems"> = {
  order_paid: "orders",
  order_refunded: "orders",
  enquiry_new: "enquiries",
  delivery_failed: "problems",
};

export async function notify(n: Notice): Promise<{ emailed: boolean }> {
  try {
    const c = db();
    if (c) {
      const { error } = await c
        .from("notifications")
        .insert({ kind: n.kind, title: n.title, body: n.body ?? null, href: n.href ?? null, dedupe: n.dedupe ?? null });
      // 23505 = already notified about this event (dedupe): stop here, no second email either
      if (error?.code === "23505") return { emailed: false };
      if (error && !/notifications/.test(error.message)) console.error("[notify] insert", error.message);
    }

    const { settings } = await loadSettings();
    const to = settings.alerts.email || process.env.CONSULT_INBOX || "";
    if (!to || !settings.alerts[KIND_PREF[n.kind]]) return { emailed: false };
    const from = process.env.ALERTS_FROM || process.env.CONSULT_FROM || process.env.BOOKS_FROM;
    if (!from || !process.env.RESEND_API_KEY) return { emailed: false }; // email not set up yet; the bell still has it

    const origin = process.env.PUBLIC_ORIGIN || site.url;
    return { emailed: await sendMail({ to, from, replyTo: n.replyTo, ...alertEmail(n, origin) }) };
  } catch (e) {
    console.error("[notify] failed", e);
    return { emailed: false };
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Short, scannable, brand-styled alert: what happened, the key facts, one button. */
function alertEmail(n: Notice, origin: string) {
  const link = n.href ? `${origin}${n.href}` : `${origin}/admin`;
  const rows = (n.detail ?? [])
    .map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#5e4430;font-size:13px;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:4px 0;color:#16253d;font-size:14px">${esc(v)}</td></tr>`)
    .join("");
  const html = `<!doctype html><html><body style="margin:0;background:#f3eee3;font-family:Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3eee3;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fbf8f2;border:1px solid #ddd2ba;border-radius:14px">
<tr><td style="background:#16253d;border-radius:14px 14px 0 0;padding:16px 24px;color:#b08a64;font-size:11px;letter-spacing:2px;text-transform:uppercase">Nwokedi Legal · Dashboard</td></tr>
<tr><td style="padding:26px 24px 8px">
<h1 style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:24px;line-height:1.25;color:#16253d">${esc(n.title)}</h1>
${n.body ? `<p style="margin:0 0 16px;color:#4b5770;font-size:15px;line-height:1.5">${esc(n.body)}</p>` : ""}
${rows ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px">${rows}</table>` : ""}
${n.message ? `<p style="margin:0 0 18px;padding:14px 16px;background:#fffdf8;border:1px solid #ece5d6;border-radius:10px;color:#263349;font-size:14px;line-height:1.55;white-space:pre-wrap">${esc(n.message)}</p>` : ""}
<p style="margin:6px 0 24px"><a href="${esc(link)}" style="display:inline-block;background:#16253d;color:#f6efe0;text-decoration:none;padding:11px 20px;border-radius:9px;font-size:14px">Open in your dashboard</a></p>
</td></tr>
<tr><td style="padding:0 24px 22px;color:#6b7385;font-size:12px">You get this because alerts are on in Settings → Alerts.${n.replyTo ? " Reply to this email to answer them directly." : ""}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [n.title, n.body, ...(n.detail ?? []).map(([k, v]) => `${k}: ${v}`), n.message, "", `Open in your dashboard: ${link}`].filter((x) => x !== undefined).join("\n");
  return { subject: n.title, html, text };
}
