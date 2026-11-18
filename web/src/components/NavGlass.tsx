"use client";

import { useEffect } from "react";

/** Shows the nav's glass pane once the page has scrolled. Renders nothing. */
export default function NavGlass() {
  useEffect(() => {
    const nav = document.querySelector(".nav");
    if (!nav) return;
    const glass = () => nav.classList.toggle("nav--scrolled", scrollY > 80);
    addEventListener("scroll", glass, { passive: true });
    glass();
    return () => removeEventListener("scroll", glass);
  }, []);
  return null;
}
