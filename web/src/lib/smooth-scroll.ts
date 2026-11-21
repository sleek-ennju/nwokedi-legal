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
