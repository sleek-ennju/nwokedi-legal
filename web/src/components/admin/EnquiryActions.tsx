"use client";

import { useTransition } from "react";
import { toast } from "@/lib/toast";
import { updateEnquiry } from "@/app/admin/actions/manage";

const DONE: Record<string, string> = { replied: "Marked as replied", archived: "Enquiry archived", new: "Enquiry reopened" };

/** Status buttons for one enquiry; each change is confirmed with a toast. */
export default function EnquiryActions({ id, status, name }: { id: string; status: string; name: string }) {
  const [pending, start] = useTransition();
  const set = (next: string) =>
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("status", next);
      try {
        await updateEnquiry(fd);
        toast.success(DONE[next], { description: name });
      } catch {
        toast.error("Couldn't update the enquiry", { description: "Please try again." });
      }
    });

  return (
    <div className="a-actions">
      {status !== "replied" && (
        <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={pending} onClick={() => set("replied")}>
          Mark replied
        </button>
      )}
      {status !== "archived" ? (
        <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={pending} onClick={() => set("archived")}>
          Archive
        </button>
      ) : (
        <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={pending} onClick={() => set("new")}>
          Reopen
        </button>
      )}
    </div>
  );
}
