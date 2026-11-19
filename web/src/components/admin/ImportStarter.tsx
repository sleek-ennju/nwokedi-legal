"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importStarterBooks, type BookResult } from "@/app/admin/actions/books";

export default function ImportStarter() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [r, setR] = useState<BookResult | null>(null);
  return (
    <div className="a-actions">
      <button
        className="a-btn"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await importStarterBooks();
            setR(res);
            if (res.ok) router.refresh();
          })
        }
      >
        {pending ? "Importing…" : "Move it into the dashboard"}
      </button>
      {r && <span className={`a-msg ${r.ok ? "a-msg--ok" : "a-msg--err"}`}>{r.message}</span>}
    </div>
  );
}
