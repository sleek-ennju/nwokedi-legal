import "server-only";

export type Mail = { to: string; subject: string; html: string; text: string; replyTo?: string; from?: string };

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.BOOKS_FROM);

/**
 * Sends one email through Resend. Returns true on success. Never throws.
 * In development without Resend configured, it logs the message instead
 * (so the whole purchase flow can be tested locally).
 */
export async function sendMail(m: Mail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = m.from || process.env.BOOKS_FROM;
  if (!key || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[mail:dev] To: ${m.to}\n[mail:dev] Subject: ${m.subject}\n${m.text}\n`);
      return true;
    }
    console.error("[mail] RESEND_API_KEY / BOOKS_FROM not configured");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: m.to, subject: m.subject, html: m.html, text: m.text, reply_to: m.replyTo }),
    });
    if (!res.ok) {
      console.error("[mail] resend failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[mail] resend error", e);
    return false;
  }
}
