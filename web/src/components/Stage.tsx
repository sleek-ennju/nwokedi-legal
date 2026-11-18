"use client";

import { useEffect, useRef } from "react";

let booted = false; // guards React strict-mode double effects in dev

/**
 * The fixed stage behind the page: wordmark, torch glow, WebGL canvas and the
 * SVG fallback emblem. Nothing here blocks first paint — the scroll story starts
 * on mount, and Three.js is fetched only once the browser is idle.
 */
export default function Stage() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (booted) return;
    booted = true;
    const root = document.documentElement;

    (async () => {
      const [{ initScroll }, { detectTier }] = await Promise.all([
        import("@/experience/scroll"),
        import("@/experience/tier"),
      ]);
      initScroll();
      const tier = detectTier();
      root.dataset.tier = tier;
      if (tier === "low" || !canvas.current) return;

      const start = () =>
        import("@/experience/experience").then((m) => m.initExperience(canvas.current!, tier));
      if ("requestIdleCallback" in window) requestIdleCallback(start, { timeout: 2000 });
      else setTimeout(start, 600);
    })();
  }, []);

  return (
    <div className="stage" aria-hidden="true">
      <div className="stage__vignette" />
      <div className="mark">
        <div className="mark__base" />
        <div className="mark__lit" />
      </div>
      <div className="torchglow" />
      <canvas ref={canvas} className="gl" />
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative SVG, no optimisation needed */}
      <img className="fallback" src="/brand/emblem.svg" alt="" width="287" height="374" />
    </div>
  );
}
