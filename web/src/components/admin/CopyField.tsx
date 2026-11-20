"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";

export default function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="a-copy">
      <input className="a-input" value={value} readOnly onFocus={(e) => e.target.select()} aria-label="Value to copy" />
      <button
        type="button"
        className="a-btn a-btn--ghost"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success("Copied to your clipboard");
          setTimeout(() => setCopied(false), 1600);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
