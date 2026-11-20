"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";

/** Share where her readers are: LinkedIn, WhatsApp, X, or copy the link. */
export default function ShareLinks({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${u}`],
    ["WhatsApp", `https://wa.me/?text=${t}%20${u}`],
    ["X", `https://x.com/intent/post?text=${t}&url=${u}`],
  ];
  return (
    <div className="art-share" aria-label="Share this article">
      <span>Share</span>
      {links.map(([label, href]) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      ))}
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success("Link copied", { description: "Paste it anywhere to share this article." });
            setTimeout(() => setCopied(false), 1800);
          } catch {
            toast.error("Couldn't copy the link", { description: "Copy it from the address bar instead." });
          }
        }}
      >
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
