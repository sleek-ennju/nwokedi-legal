import Image from "next/image";
import type { Book } from "@/lib/books/types";

type Props = {
  book: Book;
  /** rendered width in px (height and depth follow) */
  width?: number;
  /** load the cover eagerly (detail page hero) */
  priority?: boolean;
  className?: string;
};

/**
 * A real, three-dimensional book in pure CSS: front cover, spine, back,
 * and page edges on three sides. Depth scales with the page count.
 * Rotation is driven by CSS variables (--ry / --rx) so callers can animate it.
 */
export default function Book3D({ book, width = 240, priority = false, className = "" }: Props) {
  const t = book.cover.theme;
  const depth = Math.round(Math.min(46, Math.max(18, book.pages / 6)) * (width / 240));
  const style = {
    "--bw": `${width}px`,
    "--bd": `${depth}px`,
    "--c-bg": t.bg,
    "--c-ink": t.ink,
    "--c-foil": t.foil,
    "--c-spine": t.spine ?? t.bg,
  } as React.CSSProperties;

  return (
    <div className={`book3d ${className}`} style={style} aria-hidden>
      <div className="book3d__face book3d__front">
        {book.cover.image ? (
          <Image src={book.cover.image} alt="" fill sizes={`${width}px`} priority={priority} />
        ) : (
          <div className="cover">
            <span className="cover__emblem" />
            <span className="cover__rule" />
            <span className="cover__title">{book.title}</span>
            {book.subtitle && <span className="cover__subtitle">{book.subtitle}</span>}
            <span className="cover__author">{book.author}</span>
          </div>
        )}
        <span className="book3d__sheen" />
      </div>
      <div className="book3d__face book3d__back">
        <span className="cover__emblem cover__emblem--back" />
      </div>
      <div className="book3d__face book3d__spine">
        <span>{book.title}</span>
      </div>
      <div className="book3d__face book3d__pages" />
      <div className="book3d__face book3d__top" />
      <div className="book3d__face book3d__bottom" />
    </div>
  );
}
