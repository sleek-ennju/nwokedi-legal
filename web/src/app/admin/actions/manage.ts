"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { ENQUIRY_STATUSES, getOrderById, setEnquiryStatus, setOrderRefunded, type EnquiryStatus } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/session";
import { sendDownloadLink } from "@/lib/fulfil";

export type ActionResult = { ok: boolean; message: string };

const origin = async () => {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : undefined;
};

/** Email the buyer a brand-new download link (fresh 72 h / 5 downloads). */
export async function resendLink(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const order = await getOrderById(String(form.get("id") ?? ""));
  if (!order) return { ok: false, message: "Order not found." };
  if (order.status !== "paid") return { ok: false, message: "Only paid orders can receive a download link." };
  const sent = await sendDownloadLink(order, await origin());
  revalidatePath("/admin/orders");
  return sent
    ? { ok: true, message: `New link sent to ${order.email}.` }
    : { ok: false, message: "The email couldn't be sent. Check the email settings and try again." };
}

/** Records a refund made in the Paystack dashboard. Download links stop working at once. */
export async function markRefunded(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const done = await setOrderRefunded(String(form.get("id") ?? ""));
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return done ? { ok: true, message: "Marked as refunded. Its download links no longer work." } : { ok: false, message: "Only paid orders can be marked refunded." };
}

export async function updateEnquiry(form: FormData) {
  await requireAdmin();
  const status = String(form.get("status")) as EnquiryStatus;
  if (!ENQUIRY_STATUSES.includes(status)) return;
  await setEnquiryStatus(String(form.get("id") ?? ""), status);
  revalidatePath("/admin/enquiries");
  revalidatePath("/admin");
}
