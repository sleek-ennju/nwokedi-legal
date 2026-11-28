"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { SMOOTH_SCROLL, touchFirst } from "@/lib/smooth-scroll";

/**
 * Smooth scrolling for the public pages that don't run the home page's scroll
 * story (books, articles, checkout). The home page drives its own Lenis through
 * GSAP's ticker; the admin keeps native scrolling, as a working tool should.
 * One instance, one animation loop, and a jump to the top on every new page.
 */
export default function SmoothScroll() {
  const path = usePathname();
  const lenis = useRef<Lenis | null>(null);
  const enabled = path !== "/" && !path.startsWith("/admin");

  useEffect(() => {
    if (!enabled || touchFirst()) return; // phones keep native scrolling
    const l = new Lenis({ ...SMOOTH_SCROLL, autoRaf: true });
    lenis.current = l;
    // sheets and readers pause the page behind them
    (window as unknown as { __lenis?: Lenis }).__lenis = l;
    return () => {
      l.destroy();
      lenis.current = null;
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
    };
  }, [enabled]);

  // new page (client navigation): start at the top, no inertia carried over
  useEffect(() => {
    lenis.current?.scrollTo(0, { immediate: true, force: true });
    lenis.current?.resize();
  }, [path]);

  return null;
}
