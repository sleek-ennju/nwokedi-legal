"use client";

import { useEffect } from "react";

const smooth = (x: number) => x * x * (3 - 2 * x);
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

/**
 * Depth-carousel behaviour for The Call (markup is server-rendered in TheCall.tsx).
 * Scroll position → a continuous "active" value with a hold on each portrait;
 * each card's place on the arc, depth, blur and light derive from its distance to it.
 */
export default function CallScrub() {
  useEffect(() => {
    const sec = document.querySelector<HTMLElement>(".call");
    if (!sec) return;
    const stage = sec.querySelector<HTMLElement>(".call__stage")!;
    const cards = [...sec.querySelectorAll<HTMLElement>(".call__card")];
    const beats = [...sec.querySelectorAll<HTMLElement>(".call__beat")];
    const thumbs = [...sec.querySelectorAll<HTMLButtonElement>(".call__thumb")];
    const count = sec.querySelector<HTMLElement>(".call__count b");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const N = cards.length;
    /** how far (in portraits) from the front a caption starts to show */
    const CAPTION_REACH = 0.32;
    sec.classList.add("is-scrubbed");

    let raf = 0,
      visible = false,
      active = -1,
      shown = -1; // last rendered "a", to skip identical frames

    const sticky = sec.querySelector<HTMLElement>(".call__sticky")!;
    // measured against the pinned frame (100svh), not the window: the address bar
    // sliding in and out on phones changes innerHeight mid-scroll, which made the
    // portraits nudge; svh never changes
    const span = () => Math.max(1, sec.offsetHeight - sticky.offsetHeight);
    // phones scroll natively (no Lenis smoothing), and touch scroll arrives in uneven
    // steps; ease toward the finger over ~70ms so the row glides instead of ticking
    const touch = matchMedia("(pointer: coarse)").matches && !reduced;
    const TAU_MS = 70;
    let lastT = 0;
    const progress = () => clamp(-sec.getBoundingClientRect().top / span());

    /** progress 0..1 → active position 0..N-1, holding still on each portrait */
    const toActive = (p: number) => {
      const raw = p * (N - 1);
      const seg = Math.min(N - 2, Math.floor(raw));
      return seg + smooth(clamp((raw - seg - 0.22) / 0.56));
    };

    const render = (a: number) => {
      const mobile = innerWidth < 760;
      // neighbours sit just clear of the front card, on a concave arc
      const spread = (cards[0].offsetWidth || 400) * (mobile ? 0.86 : 1.02);
      cards.forEach((c, i) => {
        const d = i - a;
        const ad = Math.abs(d);
        const x = d * spread;
        const z = -Math.pow(Math.min(ad, 2), 0.8) * (mobile ? 180 : 320);
        const ry = clamp(-d * 30, -42, 42);
        const s = 1 - Math.min(ad, 1.5) * 0.08;
        c.style.transform = `translate3d(${x.toFixed(1)}px,0,${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) scale(${s.toFixed(3)})`;
        // depth of field ramps in quickly, so the front portrait is the only sharp one
        c.style.setProperty("--d", Math.min(1.4, Math.pow(ad, 0.7)).toFixed(3));
        c.style.zIndex = String(100 - Math.round(ad * 10));
      });
      // captions follow their portrait: fully legible only once it is sharp and in
      // front, beginning to appear as it steps forward (same "a" as the blur above)
      beats.forEach((b, i) => {
        const o = 1 - smooth(clamp(Math.abs(i - a) / CAPTION_REACH));
        b.style.opacity = o.toFixed(3);
        b.style.transform = `translate3d(0,${((1 - o) * 10).toFixed(1)}px,0)`;
        b.style.visibility = o < 0.01 ? "hidden" : "visible";
      });
      const idx = Math.round(a);
      if (idx !== active) {
        active = idx;
        beats.forEach((b, i) => {
          b.classList.toggle("is-active", i === idx);
          b.setAttribute("aria-hidden", String(i !== idx));
        });
        thumbs.forEach((t, i) => {
          t.classList.toggle("is-active", i === idx);
          t.setAttribute("aria-pressed", String(i === idx));
        });
        if (count) count.textContent = String(idx + 1).padStart(2, "0");
      }
    };

    const tick = (t: number) => {
      raf = 0;
      if (!visible) return;
      const target = toActive(progress());
      let a = target;
      if (touch && shown >= 0) {
        const dt = Math.min(64, t - (lastT || t));
        a = shown + (target - shown) * (1 - Math.exp(-dt / TAU_MS));
        if (Math.abs(target - a) < 0.0005) a = target;
      }
      lastT = t;
      if (Math.abs(a - shown) > 0.0005) {
        shown = a;
        render(a);
      }
      raf = requestAnimationFrame(tick);
    };

    // jump to a portrait (thumbnail, keyboard): land in the middle of its hold
    const scrollToBeat = async (i: number) => {
      const y = sec.offsetTop + (i / (N - 1)) * span();
      const { getLenis } = await import("@/experience/scroll");
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(y, { duration: reduced ? 0 : 0.9 });
      else scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
    };
    thumbs.forEach((t) => t.addEventListener("click", () => scrollToBeat(Number(t.dataset.to))));

    // drag / swipe the row: horizontal movement scrubs the story
    let dragX: number | null = null,
      startY = 0,
      dragged = false;
    const onDown = (e: PointerEvent) => {
      dragX = e.clientX;
      startY = window.scrollY;
      dragged = false;
    };
    const onMove = async (e: PointerEvent) => {
      if (dragX === null) return;
      const dx = e.clientX - dragX;
      if (!dragged && Math.abs(dx) < 8) return; // not a horizontal drag (yet)
      dragged = true;
      const per = innerWidth < 760 ? innerWidth * 0.66 : Math.min(innerWidth * 0.27, 470);
      const y = startY - (dx / per) * (span() / (N - 1));
      const { getLenis } = await import("@/experience/scroll");
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(y, { immediate: true });
      else scrollTo(0, y);
    };
    const onUp = () => {
      if (dragX === null) return;
      dragX = null;
      if (!dragged) return; // a tap or a vertical scroll — leave it alone
      scrollToBeat(Math.round(toActive(progress()))); // settle on the nearest portrait
    };
    stage.addEventListener("pointerdown", onDown);
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("pointerup", onUp);
    addEventListener("pointercancel", onUp);

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(tick);
    });
    io.observe(sec);
    render(0);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      stage.removeEventListener("pointerdown", onDown);
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerup", onUp);
      removeEventListener("pointercancel", onUp);
    };
  }, []);
  return null;
}
