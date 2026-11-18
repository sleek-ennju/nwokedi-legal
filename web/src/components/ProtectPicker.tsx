"use client";

import { useState } from "react";
import { practices, protectOptions } from "@/lib/site";

export default function ProtectPicker() {
  const [picked, setPicked] = useState<number | null>(null);
  const option = picked === null ? null : protectOptions[picked];
  const practice = option ? practices[option.to] : null;

  const go = async (e: React.MouseEvent) => {
    if (!option) return;
    e.preventDefault();
    const { scrollToChapter } = await import("@/experience/scroll");
    scrollToChapter(option.to);
  };

  return (
    <>
      <div className="chips" role="group" aria-label="Choose what you are protecting">
        {protectOptions.map((o, i) => (
          <button key={o.label} type="button" className="chip" aria-pressed={picked === i} onClick={() => setPicked(i)}>
            {o.label}
          </button>
        ))}
      </div>
      <div className="answer" aria-live="polite">
        {practice && option ? (
          <div className="answer__card" key={picked}>
            <div>
              <p className="eyebrow eyebrow--ink">For {option.label.toLowerCase()}</p>
              <h3>{practice.name}</h3>
              <p>{practice.short}</p>
            </div>
            <a className="button button--ink" href={`#${practice.id}`} onClick={go}>
              <span className="seal-dot" />
              See how we help
            </a>
          </div>
        ) : (
          <p className="answer__lead">Choose one — we&apos;ll bring the right counsel to light.</p>
        )}
      </div>
    </>
  );
}
