import type { LenisOptions } from "lenis";

/**
 * One scroll feel for the whole public site (Lenis 1.3). Researched settings:
 * - lerp 0.085: silky but controlled; below ~0.07 feels floaty and laggy.
 *   (lerp follows how fast you scroll; a fixed duration feels the same for every flick.)
 * - wheel/touch multipliers stay at 1: more overshoots on trackpads.
 * - syncTouch off: phones keep their own native momentum (best feel, best Lighthouse).
 * - stopInertiaOnNavigate: leftover momentum never drags into the next page.
 * - respectReducedMotion: for people who ask for less motion, scrolling tracks 1:1.
 * - anchors offset: in-page links land below the fixed navigation, not under it.
 */
export const NAV_OFFSET = 88;

/**
 * Phones and tablets get the browser's own scrolling: Lenis is never started on them. On a phone the toolbar slides
 * in and out as you scroll (a window resize), and Lenis re-measuring on it cut iOS momentum short, which read as a
 * snap or a jump, worst scrolling back up. syncTouch: false alone wasn't enough. GSAP ScrollTrigger still runs on
 * phones (the home page story needs it) and follows native scroll, with ignoreMobileResize on.
 */
export const touchFirst = () => matchMedia("(hover: none) and (pointer: coarse)").matches;

export const SMOOTH_SCROLL: LenisOptions = {
  lerp: 0.085,
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 1,
  syncTouch: false,
  stopInertiaOnNavigate: true,
  respectReducedMotion: true,
  anchors: { offset: -NAV_OFFSET },
};
