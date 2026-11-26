import "server-only";
import { site } from "@/lib/site";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Delivery = {
  name: string;
  title: string;
  url: string;
  reference: string;
  expiresHours: number;
  maxUses: number;
  logoUrl: string;
};

/**
 * Book delivery email. Table-based, inline-styled HTML (what email clients
 * reliably render), in the brand palette, with a plain-text twin.
 */
export function bookDeliveryEmail(d: Delivery) {
  const first = d.name.trim().split(/\s+/)[0] || "there";
  const subject = `Your copy of ${d.title}`;
  const text = [
    `Hello ${first},`,
    "",
    `Thank you for buying ${d.title}. Your copy is ready:`,
    d.url,
    "",
    `This download link works for ${d.expiresHours} hours (up to ${d.maxUses} downloads). Once saved, the book is yours to keep.`,
    `Order reference: ${d.reference}`,
    "",
    "If the link has expired or anything goes wrong, just reply to this email and we'll send a fresh one.",
    "",
    site.name,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#F3EEE3;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3EEE3;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FBF8F1;border:1px solid #E2D9C4;border-radius:14px;overflow:hidden;">
        <tr><td style="background:#16253D;padding:26px 32px;">
          <img src="${esc(d.logoUrl)}" width="180" alt="${esc(site.name)}" style="display:block;border:0;max-width:180px;height:auto;">
        </td></tr>
        <tr><td style="padding:36px 32px 8px;font-family:Georgia,'Times New Roman',serif;color:#16253D;">
          <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#856244;">Your book is ready</p>
          <h1 style="margin:0 0 18px;font-size:30px;line-height:1.1;font-weight:normal;">${esc(d.title)}</h1>
          <p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#33415a;">
            Hello ${esc(first)}, thank you for your purchase. Your copy is ready to download.
          </p>
        </td></tr>
        <tr><td style="padding:0 32px 28px;">
          <a href="${esc(d.url)}" style="display:inline-block;background:#16253D;color:#E9E1CE;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;padding:16px 26px;border-radius:999px;">
            <span style="color:#C61C23;">&#9679;</span>&nbsp;&nbsp;Download your book
          </a>
        </td></tr>
        <tr><td style="padding:0 32px 30px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#5b6577;">
          This download link works for <b>${d.expiresHours} hours</b> (up to <b>${d.maxUses} downloads</b>). Once saved, the book is yours to keep.
          If it expires or anything goes wrong, simply reply to this email and we'll send a fresh link.
          <br><br>Order reference: <span style="font-family:monospace;color:#16253D;">${esc(d.reference)}</span>
        </td></tr>
        <tr><td style="border-top:1px solid #E2D9C4;padding:18px 32px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:#8a8f98;">
          ${esc(site.name)} · ${esc(site.tagline)}<br>
          This copy is licensed to you for personal use.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  return { subject, html, text };
}

/** "Reset your dashboard password". Same shell as the delivery email, with one button. */
export function passwordResetEmail(d: { name?: string; url: string; minutes: number; logoUrl: string }) {
  const first = d.name?.trim().split(/\s+/)[0] || "there";
  const subject = "Reset your dashboard password";
  const text = [
    `Hello ${first},`,
    "",
    "Someone (hopefully you) asked to reset the password for the Nwokedi Legal dashboard. Open this link to choose a new one:",
    d.url,
    "",
    `The link works once, for ${d.minutes} minutes. You'll also need the 6-digit code from your authenticator app.`,
    "",
    "If you didn't ask for this, ignore this email. Your password stays as it is.",
    "",
    site.name,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#F3EEE3;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3EEE3;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FBF8F1;border:1px solid #E2D9C4;border-radius:14px;overflow:hidden;">
        <tr><td style="background:#16253D;padding:26px 32px;">
          <img src="${esc(d.logoUrl)}" width="180" alt="${esc(site.name)}" style="display:block;border:0;max-width:180px;height:auto;">
        </td></tr>
        <tr><td style="padding:36px 32px 8px;font-family:Georgia,'Times New Roman',serif;color:#16253D;">
          <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#856244;">Dashboard · Password reset</p>
          <h1 style="margin:0 0 18px;font-size:30px;line-height:1.1;font-weight:normal;">Choose a new password</h1>
          <p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#33415a;">
            Hello ${esc(first)}, someone (hopefully you) asked to reset the password for your dashboard.
          </p>
        </td></tr>
        <tr><td style="padding:0 32px 28px;">
          <a href="${esc(d.url)}" style="display:inline-block;background:#16253D;color:#E9E1CE;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;padding:16px 26px;border-radius:999px;">
            <span style="color:#C61C23;">&#9679;</span>&nbsp;&nbsp;Reset my password
          </a>
        </td></tr>
        <tr><td style="padding:0 32px 30px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#5b6577;">
          The link works <b>once</b>, for <b>${d.minutes} minutes</b>. You&rsquo;ll also need the 6-digit code from your authenticator app.
          <br><br>If you didn&rsquo;t ask for this, ignore this email. Your password stays as it is.
        </td></tr>
        <tr><td style="border-top:1px solid #E2D9C4;padding:18px 32px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:#8a8f98;">
          ${esc(site.name)} · Private dashboard
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  return { subject, html, text };
}
