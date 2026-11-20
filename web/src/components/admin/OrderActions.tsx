"use client";

import { toast } from "@/lib/toast";
import { useActionState, useEffect, useState } from "react";
import { markRefunded, resendLink } from "@/app/admin/actions/manage";

/** Resend a download link; record a refund (two clicks, because it switches the links off). */
export default function OrderActions({ id, canAct }: { id: string; canAct: boolean }) {
  const [sent, send, sending] = useActionState(resendLink, null);
  const [refund, doRefund, refunding] = useActionState(markRefunded, null);
  const [confirming, setConfirming] = useState(false);
  const result = refund ?? sent;

  useEffect(() => {
    if (!sent) return;
    if (sent.ok) toast.success("Download link sent", { description: sent.message });
    else toast.error("Link not sent", { description: sent.message });
  }, [sent]);
  useEffect(() => {
    if (!refund) return;
    if (refund.ok) toast.success("Refund recorded", { description: refund.message });
    else toast.error("Couldn't record the refund", { description: refund.message });
  }, [refund]);

  const message = result && (
    <p className={`a-msg ${result.ok ? "a-msg--ok" : "a-msg--err"}`} role="status">
      {result.message}
    </p>
  );
  // after a refund the buttons go away, but the confirmation stays
  if (!canAct) return message || null;
  return (
    <div>
      <div className="a-actions">
        <form action={send}>
          <input type="hidden" name="id" value={id} />
          <button className="a-btn a-btn--ghost a-btn--sm" disabled={sending}>
            {sending ? "Sending…" : "Resend link"}
          </button>
        </form>
        {confirming ? (
          <form action={doRefund} className="a-actions">
            <input type="hidden" name="id" value={id} />
            <button className="a-btn a-btn--confirm a-btn--sm" disabled={refunding}>
              {refunding ? "Saving…" : "Confirm refund"}
            </button>
            <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <button type="button" className="a-btn a-btn--danger a-btn--sm" onClick={() => setConfirming(true)}>
            Mark refunded
          </button>
        )}
      </div>
      {confirming && !refund && (
        <p className="a-msg a-mute">Refund the money in Paystack first. This only records it and switches off the download links.</p>
      )}
      {message}
    </div>
  );
}
