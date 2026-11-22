"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * The Chambers rail. On a desk it is the fixed left rail; on a phone it folds
 * into a slim top bar whose menu opens as a pool of lamplight spreading out
 * from the button, with the sections rising into it one after another.
 */
export default function AdminSide({ brand, children }: { brand: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.classList.add("a-menu-open");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", onKey);
    return () => {
      root.classList.remove("a-menu-open");
      removeEventListener("keydown", onKey);
    };
  }, [open]);

  // growing past phone width turns the menu back into the rail
  useEffect(() => {
    const mq = matchMedia("(min-width: 861px)");
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <aside className="a-side" data-open={open || undefined}>
      <div className="a-side__bar">
        {brand}
        <button
          type="button"
          className="a-burger"
          aria-expanded={open}
          aria-controls="a-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          <span />
          <span />
        </button>
      </div>
      <div
        className="a-side__panel"
        id="a-menu"
        onClick={(e) => {
          if ((e.target as Element).closest("a")) setOpen(false);
        }}
      >
        {children}
      </div>
    </aside>
  );
}
