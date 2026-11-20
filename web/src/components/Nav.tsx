/* eslint-disable @next/next/no-html-link-for-pages --
   Deliberate full-document links: the home page boots a WebGL worker and a scroll
   timeline once per document, so entering/leaving it must be a real page load. */
import { site } from "@/lib/site";
import NavGlass from "./NavGlass";

type Props = {
  /** "light" = navy ink on a cream page (store pages); "dark" = cream on the dark stage */
  theme?: "dark" | "light";
  current?: "books" | "articles";
};

/** Primary navigation, shared by every page. Links are absolute ("/#…") so they work from anywhere. */
export default function Nav({ theme = "dark", current }: Props) {
  return (
    <header className={`nav${theme === "light" ? " nav--ink nav--fixed-ink" : ""}`}>
      <NavGlass />
      <a className="nav__brand" href="/#top" aria-label={`${site.name}, home`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny SVG logo */}
        <img className="logo-cream" src="/brand/lockup.svg" alt={site.name} width="190" height="33" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="logo-ink" src="/brand/lockup-ink.svg" alt="" width="190" height="33" />
      </a>
      <nav className="nav__links" aria-label="Primary">
        <a href="/#practice">Practice</a>
        <a href="/#principal">The Principal</a>
        <a href="/books" aria-current={current === "books" ? "page" : undefined}>
          Books
        </a>
        <a href="/articles" aria-current={current === "articles" ? "page" : undefined}>
          Articles
        </a>
        <a href="/#consult" className="nav__cta">
          <span className="seal-dot" />
          Consultation
        </a>
      </nav>
    </header>
  );
}
