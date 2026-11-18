"use server";

import { z } from "zod";
import { practices } from "@/lib/site";

export type ConsultState = {
  status: "idle" | "ok" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "phone" | "practice" | "message", string>>;
  /** echoed back on error so the form can refill (React resets forms after an action) */
  values?: Record<string, string>;
};

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(120),
  email: z.string().trim().email("Please enter a valid email address.").max(200),
  phone: z
    .string()
    .trim()
    .max(40)
    .regex(/^[+\d\s()-]*$/, "Please use digits, spaces and + only.")
    .optional()
    .or(z.literal("")),
  practice: z.enum(["not-sure", ...practices.map((p) => p.id)] as [string, ...string[]], {
    errorMap: () => ({ message: "Please choose an area." }),
  }),
  message: z.string().trim().min(10, "A sentence or two helps us prepare.").max(3000),
});

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function verifyTurnstile(token: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured yet (dev / pre-launch)
  if (!token) return false;
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: token }),
  });
  const data = (await res.json()) as { success: boolean };
  return data.success;
}

export async function submitConsultation(_prev: ConsultState, form: FormData): Promise<ConsultState> {
  // validate first, so a real person always gets field errors, never a fake success
  const values = Object.fromEntries(
    ["name", "email", "phone", "practice", "message"].map((k) => [k, String(form.get(k) ?? "").slice(0, 3000)])
  );
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const fe: ConsultState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as keyof NonNullable<ConsultState["fieldErrors"]>;
      fe[k] ??= issue.message;
    }
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors: fe, values };
  }

  // bots: a valid-looking form with the honeypot filled, or completed faster than
  // a human could type it (≥4 fields in under 3 s) → accept silently, send nothing
  const started = Number(form.get("started_at") || 0);
  if (form.get("company_website") || (started > 0 && Date.now() - started < 3000)) {
    return { status: "ok" };
  }

  if (!(await verifyTurnstile(form.get("cf-turnstile-response") as string | null))) {
    return { status: "error", message: "We couldn't verify the request. Please try again.", values };
  }

  const d = parsed.data;
  const area = practices.find((p) => p.id === d.practice)?.name ?? "Not sure yet";
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONSULT_INBOX;
  const from = process.env.CONSULT_FROM; // e.g. "Nwokedi Legal <enquiries@nwokedilegal.com>"

  if (!apiKey || !to || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[consult] email not configured — enquiry received:", { ...d, area });
      return { status: "ok" };
    }
    return {
      status: "error",
      message: "Our enquiry form is briefly unavailable. Please email us directly.",
      values,
    };
  }

  const html = `
    <h2 style="font-family:Georgia,serif">New consultation request</h2>
    <p><b>Name:</b> ${esc(d.name)}<br/><b>Email:</b> ${esc(d.email)}<br/>
    <b>Phone:</b> ${esc(d.phone || "—")}<br/><b>Area:</b> ${esc(area)}</p>
    <p style="white-space:pre-wrap">${esc(d.message)}</p>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, reply_to: d.email, subject: `Consultation — ${area} — ${d.name}`, html }),
  });
  if (!res.ok) {
    console.error("[consult] resend failed", res.status, await res.text());
    return { status: "error", message: "Something went wrong sending your request. Please try again.", values };
  }
  // Phase 2: also persist to Supabase `enquiries` so it appears in the admin.
  return { status: "ok" };
}
