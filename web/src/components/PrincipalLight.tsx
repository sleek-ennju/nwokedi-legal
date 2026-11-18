"use client";

import { useEffect } from "react";
import { P } from "@/experience/state";

/**
 * Behaviour for the signature reveal (markup is server-rendered in Principal.tsx,
 * so none of it costs hydration). Her portrait waits in darkness; the visitor's
 * light — pointer on desktop, tilt on phones — brings her out of it. Scrolling
 * widens the light until she is fully lit, so nobody is ever left in the dark.
 */
export default function PrincipalLight() {
  useEffect(() => {
    const sec = document.getElementById("principal");
    const el = sec?.querySelector<HTMLElement>(".principal__figure");
    if (!el || !sec) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      el.style.setProperty("--lr", "160%");
      return;
    }

    let raf = 0,
      visible = false;
    let lx = 0.42,
      ly = 0.32; // resting light: on her face
    let local: { x: number; y: number; t: number } | null = null;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      local = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, t: performance.now() };
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    const onTouch = (e: TouchEvent) => onMove(e.touches[0] as unknown as PointerEvent);
    el.addEventListener("touchmove", onTouch, { passive: true });
    sec.addEventListener("pointermove", onMove, { passive: true });

    const tick = () => {
      raf = 0;
      if (!visible) return;
      const now = performance.now();
      // target: the pointer over the section, else phone tilt (shared P), else a slow drift
      let tx: number, ty: number;
      if (local && now - local.t < 2500) {
        tx = local.x;
        ty = local.y;
      } else if (now - P.lastMove < 2500 && matchMedia("(pointer: coarse)").matches) {
        tx = 0.5 + P.tx * 0.45;
        ty = 0.4 - P.ty * 0.4;
      } else {
        const t = now / 1000;
        tx = 0.45 + Math.sin(t * 0.45) * 0.12;
        ty = 0.33 + Math.sin(t * 0.6 + 1) * 0.08;
      }
      lx += (tx - lx) * 0.08;
      ly += (ty - ly) * 0.08;

      // scroll widens the light: 26% when she enters, fully lit by the time she's centred
      const r = sec.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height * 0.35)));
      const radius = 26 + Math.pow(Math.max(0, (p - 0.25) / 0.6), 1.6) * 140;

      el.style.setProperty("--lx", `${(lx * 100).toFixed(1)}%`);
      el.style.setProperty("--ly", `${(ly * 100).toFixed(1)}%`);
      el.style.setProperty("--lr", `${Math.min(radius, 170).toFixed(1)}%`);
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(tick);
    });
    io.observe(sec);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("touchmove", onTouch);
      sec.removeEventListener("pointermove", onMove);
    };
  }, []);
  return null;
}
