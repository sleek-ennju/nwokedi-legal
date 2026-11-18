"use client";

import { useEffect, useRef } from "react";

/**
 * Lets the visitor pick the book up: drag (or swipe) to turn it, and it eases
 * back to a resting three-quarter view with a slow, breathing sway when left alone.
 */
export default function BookTurn({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const book = el?.querySelector<HTMLElement>(".book3d");
    if (!el || !book) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const REST_Y = -24;
    let ry = REST_Y,
      rx = 4,
      vy = 0,
      dragging = false,
      lastX = 0,
      lastY = 0,
      lastInput = -1e9,
      raf = 0,
      visible = true;

    const tick = (t: number) => {
      raf = 0;
      if (!visible) return;
      const idle = !dragging && t - lastInput > 1800;
      if (!dragging) {
        // momentum, then a soft spring back to the resting angle
        ry += vy;
        vy *= 0.92;
        if (idle) {
          const sway = reduced ? 0 : Math.sin(t / 1600) * 6;
          ry += (REST_Y + sway - ry) * 0.04;
          rx += (4 + (reduced ? 0 : Math.sin(t / 2100) * 2) - rx) * 0.04;
        }
      }
      book.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
      book.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
      raf = requestAnimationFrame(tick);
    };

    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      vy = 0;
      el.setPointerCapture(e.pointerId);
      el.classList.add("is-dragging");
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX,
        dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      ry += dx * 0.5;
      rx = Math.max(-20, Math.min(20, rx - dy * 0.25));
      vy = dx * 0.5;
      lastInput = performance.now();
    };
    const up = () => {
      dragging = false;
      lastInput = performance.now();
      el.classList.remove("is-dragging");
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    raf = requestAnimationFrame(tick);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, []);

  return (
    <div className="book-turn" ref={ref}>
      {children}
    </div>
  );
}
