"use server";

import { z } from "zod";
import { practices } from "@/lib/site";
import { saveEnquiry } from "@/lib/db/store";
import { notify } from "@/lib/notify";

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

  // bots: a valid-looking form with the trap filled, or completed faster than a
  // human could type it (≥4 fields in under 3 s). It looks accepted and is saved
  // straight to Archived with the reason, without pinging her, so a real person
  // caught by mistake can still be found.
  const started = Number(form.get("started_at") || 0);
  const tookMs = started > 0 ? Date.now() - started : null;
  const trap = form.get("nl_check")
    ? "a hidden anti-spam field was filled in"
    : tookMs !== null && tookMs < 3000
      ? `the form was completed in ${(tookMs / 1000).toFixed(1)}s`
      : null;
  if (trap) {
    const d = parsed.data;
    const area = practices.find((p) => p.id === d.practice)?.name ?? "Not sure yet";
    console.warn(`[consult] held by the spam filter (${trap}); saved to Archived`);
    await saveEnquiry(
      {
        name: d.name,
        email: d.email,
        phone: d.phone,
        practice: area,
        message: `[Held by the spam filter: ${trap}. If this is a real person, reply as normal.]\n\n${d.message}`,
      },
      { archived: true }
    );
    return { status: "ok" };
  }

  if (!(await verifyTurnstile(form.get("cf-turnstile-response") as string | null))) {
    return { status: "error", message: "We couldn't verify the request. Please try again.", values };
  }

  const d = parsed.data;
  const area = practices.find((p) => p.id === d.practice)?.name ?? "Not sure yet";
  // saved first, so an enquiry is never lost even if the email step fails
  const saved = await saveEnquiry({ name: d.name, email: d.email, phone: d.phone, practice: area, message: d.message });

  // her dashboard bell (always) + an email alert (when set up); replying answers the enquirer
  const { emailed } = await notify({
    kind: "enquiry_new",
    title: `New enquiry · ${area}`,
    body: `${d.name} would like to talk about ${area === "Not sure yet" ? "a legal matter" : area.toLowerCase()}.`,
    href: "/admin/enquiries",
    replyTo: d.email,
    detail: [
      ["Name", d.name],
      ["Email", d.email],
      ["Phone", d.phone || "—"],
      ["Area", area],
    ],
    message: d.message,
  });

  // the enquiry reached her if it was stored, or (database down) at least emailed
  if (saved || emailed) return { status: "ok" };
  if (process.env.NODE_ENV !== "production") {
    console.info("[consult] not stored or emailed (dev) — enquiry received:", { ...d, area });
    return { status: "ok" };
  }
  return { status: "error", message: "Our enquiry form is briefly unavailable. Please email us directly.", values };
}
