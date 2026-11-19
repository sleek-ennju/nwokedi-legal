"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SamplePage } from "@/lib/books/types";
import { track } from "@/lib/analytics";

type Props = { slug: string; title: string; pages: SamplePage[]; buyLabel: string; onBuy: () => void; disabled?: boolean };

/**
 * The sneak peek. A full-screen reader that turns pages like paper:
 * spreads on desktop, single pages on phones. Arrow keys, click, or swipe.
 * Only sample pages ever reach the browser; the end card leads to purchase.
 */
export default function SampleReader({ slug, title, pages, buyLabel, onBuy, disabled }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [spread, setSpread] = useState(false);
  const seen = useRef(new Set<number>());

  const step = spread ? 2 : 1;
  const total = pages.length + 1; // + end card
  const last = Math.max(0, total - step);

  const open = () => {
    setSpread(matchMedia("(min-width: 900px)").matches);
    setI(0);
    dialog.current?.showModal();
    track("sample_open", { slug });
  };

  const go = useCallback(
    (d: 1 | -1) => {
      setDir(d);
      setI((cur) => Math.min(last, Math.max(0, cur + d * step)));
    },
    [last, step]
  );

  // depth tracking: how far into the sample each reader gets
  useEffect(() => {
    if (!dialog.current?.open) return;
    const n = Math.min(i + step, pages.length);
    if (!seen.current.has(n)) {
      seen.current.add(n);
      track("sample_page", { slug, n });
      if (n >= pages.length) track("sample_complete", { slug });
    }
  }, [i, step, pages.length, slug]);

  // keyboard
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const onKey = (e: KeyboardEvent) => {
      if (!d.open) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [go]);

  // swipe
  const startX = useRef<number | null>(null);
  const onDown = (e: React.PointerEvent) => (startX.current = e.clientX);
  const onUp = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  };

  const renderPage = (idx: number, side: "left" | "right" | "single") => {
    if (idx >= total) return <div className={`leaf leaf--${side} leaf--blank`} key={`blank-${idx}`} />;
    if (idx === pages.length)
      return (
        <div className={`leaf leaf--${side} leaf--end`} key="end">
          <p className="eyebrow eyebrow--ink">End of sample</p>
          <p className="leaf__end-title">Keep reading {title}.</p>
          <p className="leaf__end-body">The full book is delivered to your email the moment payment is confirmed.</p>
          <button
            type="button"
            className="button button--ink"
            disabled={disabled}
            onClick={() => {
              dialog.current?.close();
              onBuy();
            }}
          >
            <span className="seal-dot" />
            {buyLabel}
          </button>
        </div>
      );
    const p = pages[idx];
    return (
      <div className={`leaf leaf--${side}${p.kind === "image" && p.teaser ? " leaf--teaser" : ""}`} key={idx}>
        {p.kind === "image" ? (
          <>
            {p.teaser && p.width && p.height ? (
              <Image
                className="leaf__teaser-img"
                src={p.src}
                alt={p.alt}
                width={p.width}
                height={p.height}
                sizes="(min-width: 900px) 40vw, 90vw"
              />
            ) : (
              <Image src={p.src} alt={p.alt} fill sizes="(min-width: 900px) 40vw, 90vw" style={{ objectFit: "contain" }} />
            )}
            {p.teaser && (
              <span className="leaf__more">
                <span>Continued in the full book</span>
              </span>
            )}
          </>
        ) : (
          <div className="leaf__text">
            {p.heading && <h3>{p.heading}</h3>}
            {p.body.map((para, k) => (
              <p key={k}>{para}</p>
            ))}
            {p.folio && <span className="leaf__folio">{p.folio}</span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <button type="button" className="button button--ghost" onClick={open}>
        Read a sample
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
          <path
            d="M8 4.2C6.6 3.2 4.6 2.8 2 3v9c2.6-.2 4.6.2 6 1.2 1.4-1 3.4-1.4 6-1.2V3c-2.6-.2-4.6.2-6 1.2Zm0 0v9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <dialog className="reader" ref={dialog} aria-label={`Sample of ${title}`}>
        <div className="reader__bar">
          <p>
            <span className="reader__title">{title}</span> <span className="reader__tag">Sample</span>
          </p>
          <form method="dialog">
            <button className="reader__close" aria-label="Close sample">
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                <path d="M4 4l10 10M14 4 4 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </form>
        </div>

        <div className="reader__stage" onPointerDown={onDown} onPointerUp={onUp}>
          <div className={`book-open${spread ? " is-spread" : ""}`} data-dir={dir} key={i}>
            {spread ? (
              <>
                {renderPage(i, "left")}
                {renderPage(i + 1, "right")}
              </>
            ) : (
              renderPage(i, "single")
            )}
          </div>
        </div>

        <div className="reader__controls">
          <button type="button" className="reader__nav" onClick={() => go(-1)} disabled={i === 0} aria-label="Previous page">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path d="M11 4 6 9l5 5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
          <div className="reader__progress" aria-hidden>
            <span style={{ transform: `scaleX(${Math.min(1, (i + step) / total)})` }} />
          </div>
          <p className="reader__count" aria-live="polite">
            {Math.min(i + 1, pages.length)}
            {spread && i + 1 < pages.length ? `–${i + 2}` : ""} / {pages.length}
          </p>
          <button type="button" className="reader__nav" onClick={() => go(1)} disabled={i >= last} aria-label="Next page">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path d="m7 4 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </dialog>
    </>
  );
}
