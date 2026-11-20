"use client";

import { useState } from "react";

/**
 * Filters the article list in place. Every article stays in the HTML (Google
 * reads them all); the chips only hide what doesn't match.
 */
export default function PracticeFilter({ options, targetId }: { options: { id: string; name: string; count: number }[]; targetId: string }) {
  const [active, setActive] = useState("all");

  const pick = (id: string) => {
    setActive(id);
    document.querySelectorAll<HTMLElement>(`#${targetId} [data-practice]`).forEach((el) => {
      el.hidden = id !== "all" && el.dataset.practice !== id;
    });
  };

  if (options.length < 2) return null;
  return (
    <div className="art-filter" role="group" aria-label="Filter by practice area">
      <button type="button" aria-pressed={active === "all"} onClick={() => pick("all")}>
        All
      </button>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={active === o.id} onClick={() => pick(o.id)}>
          {o.name}
          <span>{o.count}</span>
        </button>
      ))}
    </div>
  );
}
