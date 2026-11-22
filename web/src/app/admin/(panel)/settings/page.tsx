import type { Metadata } from "next";
import { headers } from "next/headers";
import CopyField from "@/components/admin/CopyField";
import PasswordForm from "@/components/admin/PasswordForm";
import SettingsForm from "@/components/admin/SettingsForm";
import { listBooksAdmin } from "@/lib/admin/books";
import { requireAdmin } from "@/lib/admin/session";
import { loadSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Settings" };

type Check = { label: string; state: "ok" | "warn" | "off"; detail: React.ReactNode };

export default async function SettingsPage() {
  const admin = await requireAdmin();
  const [{ settings, tableReady }, { books }, h] = await Promise.all([loadSettings(), listBooksAdmin(), headers()]);
  const origin = process.env.PUBLIC_ORIGIN || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;

  const key = process.env.PAYSTACK_SECRET_KEY ?? "";
  const live = key.startsWith("sk_live_");
  const missingFiles = books.filter((b) => b.book.status === "published" && !b.file);
  const checks: Check[] = [
    {
      label: "Payments (Paystack)",
      state: !key ? "off" : live ? "ok" : "warn",
      detail: !key ? "Not connected — checkout can't take payments." : live ? "Live: real cards are charged." : "Test mode: no real money moves. Switch to live keys at launch.",
    },
    {
      label: "Book delivery emails",
      state: process.env.RESEND_API_KEY && process.env.BOOKS_FROM ? "ok" : "off",
      detail:
        process.env.RESEND_API_KEY && process.env.BOOKS_FROM
          ? `Sending from ${process.env.BOOKS_FROM}`
          : "Not set up — buyers won't receive their download email. Needs the firm's own email domain (e.g. books@nwokedilegal.com).",
    },
    {
      label: "Enquiry alerts",
      state: process.env.RESEND_API_KEY && process.env.CONSULT_INBOX && process.env.CONSULT_FROM ? "ok" : "warn",
      detail:
        process.env.CONSULT_INBOX && process.env.RESEND_API_KEY
          ? `New enquiries are emailed to ${process.env.CONSULT_INBOX}`
          : "Enquiries are saved here, but no email alert is sent yet. Check the Enquiries page.",
    },
    {
      label: "Book files",
      state: missingFiles.length ? "off" : "ok",
      detail: missingFiles.length ? `Missing for: ${missingFiles.map((b) => b.book.title).join(", ")}` : "Every book on sale has its file.",
    },
    {
      label: "Google",
      state: process.env.SITE_NOINDEX === "1" ? "warn" : "ok",
      detail: process.env.SITE_NOINDEX === "1" ? "Hidden from search engines (review mode). Opened up at launch." : "Visible to search engines.",
    },
  ];

  return (
    <>
      <header className="a-head">
        <div>
          <h1>Settings</h1>
          <p>How the store behaves, and whether everything it relies on is switched on.</p>
        </div>
      </header>

      {!tableReady && (
        <section className="a-card a-callout a-callout--warn">
          <h2>Settings storage needs a one-time set-up</h2>
          <p className="a-card__sub">
            Until then, the defaults below apply ({settings.downloads.hours}-hour links, {settings.downloads.uses} downloads, store open). Your developer runs{" "}
            <code>supabase/migrations/20261120120000_settings_media.sql</code> in Supabase once.
          </p>
        </section>
      )}

      <SettingsForm settings={settings} disabled={!tableReady} />

      <PasswordForm email={admin.email} />

      <section className="a-card a-section">
        <h2>Status</h2>
        <p className="a-card__sub">What the store depends on. Amber and red items need your developer.</p>
        <ul className="a-checks">
          {checks.map((c) => (
            <li key={c.label}>
              <span className={`a-dot a-dot--${c.state}`} aria-hidden />
              <span>
                <strong>{c.label}</strong>
                <span className="a-small a-mute">{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="a-field a-field--wide a-section">
          <span className="a-field__label">
            Paystack webhook URL
            <small>Paste into Paystack → Settings → API Keys &amp; Webhooks, so payments are confirmed even if a buyer closes the tab</small>
          </span>
          <CopyField value={`${origin}/api/paystack/webhook`} />
        </div>
      </section>
    </>
  );
}

/** Admin screens read the session and live data on every request, so they block rather than prerender. */
export const instant = false;
