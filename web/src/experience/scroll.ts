import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { K, L, P, S, vis } from "./state";

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;
export const getLenis = () => lenis;

/** Scroll to a practice chapter by index (lands mid-chapter, inside the pinned range). */
export function scrollToChapter(idx: number) {
  const sec = document.querySelector<HTMLElement>(".chapters");
  if (!sec) return;
  const y = sec.offsetTop - innerHeight + sec.offsetHeight * (0.2 + 0.8 * ((idx + 0.5) / 4));
  if (lenis) lenis.scrollTo(y, { duration: 2 });
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

  if (!reduced) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis!.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    root.classList.add("lenis");
  }

  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href")!;
      const el = id.length > 1 ? document.querySelector<HTMLElement>(id) : null;
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { duration: 1.6 });
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
    // a plain scroll check (a ScrollTrigger range ending at "max" switches off at the very bottom)
    const glass = () => nav.classList.toggle("nav--scrolled", scrollY > 80);
    addEventListener("scroll", glass, { passive: true });
    glass();
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
        scrub: reduced ? true : 1.1,
        invalidateOnRefresh: true,
        onUpdate: (st) => {
          // first 1/5 = hand-off from the hero, then 4 equal chapters
          const p = (st.progress - 0.2) / 0.8;
          setActive(p < 0 ? 0 : Math.min(3, Math.floor(p * 4)));
          if (fill) fill.style.transform = `scaleY(${gsap.utils.clamp(0, 1, p)})`;
        },
      },
    });

    tl.to(S, { x: side.x, y: side.y, scale: side.scale, rotY: turns[0], duration: 1 }, 0)
      .to(".mark", { opacity: 0.35, duration: 1 }, 0)
      .to(".fallback", { opacity: 0, duration: 0.6 }, 0)
      .to(S, { rotY: turns[1], rotX: 0.06, duration: 0.6, ease: "power2.inOut" }, 1.7)
      .to(S, { rotY: turns[2], rotX: -0.05, duration: 0.6, ease: "power2.inOut" }, 2.7)
      .to(S, { rotY: turns[3], rotX: 0.0, duration: 0.6, ease: "power2.inOut" }, 3.7)
      .to({}, { duration: 0.7 }, 4.3);

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
