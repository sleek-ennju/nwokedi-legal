import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { NAV_OFFSET, SMOOTH_SCROLL, touchFirst } from "@/lib/smooth-scroll";
import { K, L, P, S, vis } from "./state";

gsap.registerPlugin(ScrollTrigger);
// phones: the address bar sliding in/out resizes the window; re-measuring every
// trigger then makes pinned sections jump. Real resizes (rotation) still refresh.
ScrollTrigger.config({ ignoreMobileResize: true });

let lenis: Lenis | null = null;
export const getLenis = () => lenis;

/**
 * Chapter pacing, in vh of scrolling (TOTAL must match `.chapters { height }` in
 * globals.css: 198vh). The first 104vh is the hand-off from the hero: the section
 * sliding up into view, with the first practice already showing. So the first
 * practice only holds briefly once pinned (FIRST), the middle two get STEP each,
 * and the last one LAST, so every practice feels the same length to the reader.
 * The timeline below runs in the same vh units.
 */
const HAND = 104;
const FIRST = 12;
const STEP = 26;
const LAST = 30;
const TOTAL = HAND + FIRST + STEP * 2 + LAST;
/** pinned offsets (vh) where practices 2, 3 and 4 take over */
const BOUNDS = [FIRST, FIRST + STEP, FIRST + STEP * 2];
const MIDS = [FIRST / 2, FIRST + STEP / 2, FIRST + STEP * 1.5, FIRST + STEP * 2 + LAST / 2];

/** Scroll to a practice chapter by index (lands mid-chapter, inside the pinned range). */
export function scrollToChapter(idx: number) {
  const sec = document.querySelector<HTMLElement>(".chapters");
  if (!sec) return;
  const y = sec.offsetTop - innerHeight + sec.offsetHeight * ((HAND + MIDS[idx]) / TOTAL);
  if (lenis) lenis.scrollTo(y, { duration: 1.4 });
  else scrollTo({ top: y, behavior: "smooth" });
}

/**
 * The scroll story. Runs on every tier (it's ~40 KB of GSAP + Lenis, no WebGL):
 * chapter switching, the red progress rail, nav theming, and the shield pose
 * values that the WebGL layer reads if it's present.
 */
export function initScroll() {
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // desktop only: phones scroll natively (see touchFirst in lib/smooth-scroll.ts), and ScrollTrigger follows that
  if (!reduced && !touchFirst()) {
    // shared feel (lib/smooth-scroll.ts); GSAP's ticker drives the single animation loop
    lenis = new Lenis({ ...SMOOTH_SCROLL, autoRaf: false });
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis!.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    root.classList.add("lenis");
  }

  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"], a[href^="/#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href")!.replace(/^\//, "");
      const el = id.length > 1 ? document.querySelector<HTMLElement>(id) : null;
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { duration: 1.6, offset: el.id === "consult" ? -NAV_OFFSET : 0 });
      else el.scrollIntoView();
    })
  );

  // pointer / touch → lamp target
  const onPoint = (x: number, y: number) => {
    P.tx = (x / innerWidth) * 2 - 1;
    P.ty = -((y / innerHeight) * 2 - 1);
    P.lastMove = performance.now();
  };
  addEventListener("pointermove", (e) => onPoint(e.clientX, e.clientY), { passive: true });
  addEventListener("touchmove", (e) => onPoint(e.touches[0].clientX, e.touches[0].clientY), { passive: true });

  // ── nav theming ──
  const nav = document.querySelector(".nav");
  if (nav) {
    gsap.utils.toArray<HTMLElement>("[data-theme='light']").forEach((sec) =>
      ScrollTrigger.create({
        trigger: sec,
        start: "top 40px",
        end: "bottom 40px",
        toggleClass: { targets: nav, className: "nav--ink" },
      })
    );
  }

  // ── stage is fully covered by an opaque section → WebGL can skip frames ──
  let coveredCount = 0;
  gsap.utils.toArray<HTMLElement>("[data-cover]").forEach((sec) =>
    ScrollTrigger.create({
      trigger: sec,
      start: "top top",
      end: "bottom bottom",
      onToggle: (st) => {
        coveredCount += st.isActive ? 1 : -1;
        K.covered = coveredCount > 0 ? 1 : 0;
      },
    })
  );

  // ── chapters ──
  const chapters = gsap.utils.toArray<HTMLElement>(".chapter");
  const fill = document.querySelector<HTMLElement>(".rail__fill");
  let active = -1;
  const setActive = (i: number) => {
    if (i === active) return;
    active = i;
    chapters.forEach((c, j) => {
      const on = j === i;
      c.classList.toggle("is-active", on);
      c.setAttribute("aria-hidden", String(!on));
    });
    // the torch flickers brighter as each chapter turns
    if (!reduced && i >= 0) gsap.fromTo(L, { torch: 1.6 }, { torch: 1, duration: 0.9, ease: "power2.out", overwrite: true });
  };
  // without JS-driven scroll yet, show the first chapter so content is never hidden
  setActive(0);
  active = -2;

  const stageEl = document.querySelector<HTMLElement>(".stage");
  // lights go down for the portrait sections, and come back up for the bookend
  const setDim = () => stageEl?.style.setProperty("--dim", (K.lift * (1 - K.cta)).toFixed(3));
  const mm = gsap.matchMedia();
  mm.add({ desktop: "(min-width: 760px)", phone: "(max-width: 759px)" }, (ctx) => {
    const phone = ctx.conditions!.phone;
    const side = phone
      ? { x: () => 0, y: () => vis().h * 0.27, scale: 0.62 }
      : { x: () => vis().w * 0.22, y: () => 0, scale: 1.05 };
    // a full coin-turn between chapters: it spins while you scroll, lands still while you read
    const TAU = Math.PI * 2;
    const turns = [-0.42, TAU + 0.36, TAU * 2 - 0.3, TAU * 3 + 0.32];

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: ".chapters",
        start: "top bottom",
        end: "bottom bottom",
        // light smoothing only: the practice switch reads the smoothed progress, so a long scrub made it lag
        scrub: reduced ? true : 0.45,
        invalidateOnRefresh: true,
        onUpdate: (st) => {
          // the hand-off from the hero, then 4 equal chapters
          const pinned = st.progress * TOTAL - HAND; // vh scrolled since the section pinned
          setActive(BOUNDS.filter((b) => pinned >= b).length);
          if (fill) fill.style.transform = `scaleY(${gsap.utils.clamp(0, 1, pinned / (TOTAL - HAND))})`;
        },
      },
    });

    // each coin-turn is centred on a practice boundary; the empty tween sets the length
    const TURN = STEP * 0.6;
    tl.to({}, { duration: TOTAL }, 0)
      .to(S, { x: side.x, y: side.y, scale: side.scale, rotY: turns[0], duration: HAND }, 0)
      .to(".mark", { opacity: 0.35, duration: HAND }, 0)
      .to(".fallback", { opacity: 0, duration: HAND * 0.6 }, 0);
    BOUNDS.forEach((b, k) =>
      tl.to(S, { rotY: turns[k + 1], rotX: [0.06, -0.05, 0][k], duration: TURN, ease: "power2.inOut" }, HAND + b - TURN / 2)
    );

    gsap.fromTo(
      K,
      { lift: 0 },
      {
        lift: 1,
        ease: "none",
        // "lights down": the stage dims to night as the shield lifts away
        onUpdate: setDim,
        scrollTrigger: { trigger: ".principal", start: "top bottom", end: "top top", scrub: 1 },
      }
    );
    gsap.fromTo(
      K,
      { cta: 0 },
      { cta: 1, ease: "none", onUpdate: setDim, scrollTrigger: { trigger: ".bookend", start: "top bottom", end: "top top", scrub: 1 } }
    );
    gsap.to(".mark", {
      opacity: 0,
      ease: "none",
      scrollTrigger: { trigger: ".bookend", start: "top bottom", end: "top 30%", scrub: true },
    });
  });

  // phones: tilt the device to move the light. Android grants this silently.
  // iOS needs a user gesture, so access is requested the first time someone
  // touches the hero or her portrait — a gem found by interacting, never announced.
  const onTilt = (e: DeviceOrientationEvent) => {
    if (e.gamma == null || e.beta == null) return;
    P.tx = gsap.utils.clamp(-1, 1, e.gamma / 30);
    P.ty = gsap.utils.clamp(-1, 1, -(e.beta - 45) / 30);
    P.lastMove = performance.now();
  };
  type IOSOrientation = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
  const DOE = (window as Window & { DeviceOrientationEvent?: IOSOrientation }).DeviceOrientationEvent;
  const needsPermission = typeof DOE?.requestPermission === "function";
  const touch = matchMedia("(pointer: coarse)").matches;
  if (touch && DOE && !needsPermission) addEventListener("deviceorientation", onTilt, { passive: true });
  if (touch && needsPermission) {
    const ask = async (e: Event) => {
      if (!(e.target as Element).closest?.(".hero, .principal__figure")) return;
      removeEventListener("click", ask);
      try {
        if ((await DOE!.requestPermission!()) === "granted")
          addEventListener("deviceorientation", onTilt, { passive: true });
      } catch {
        /* declined: touch-drag still moves the light */
      }
    };
    addEventListener("click", ask);
  }

  return { lenis };
}
