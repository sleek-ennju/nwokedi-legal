"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { subscribeToasts, toast, type ToastItem } from "@/lib/toast";
import "./toaster.css";

/**
 * Sonner-style stack (research: Sonner / transitions.dev "toast" + "banner stacking"):
 * new toasts rise in (350 ms, fade + blur + slight scale), older ones step back
 * (smaller, higher, dimmer), hovering fans the stack out, leaving is faster (250 ms).
 * Our signature: one sweep of torchlight across each toast as it lands, and the
 * success tick draws itself in torch gold. Swipe or × to dismiss; timers pause on
 * hover/focus and while the tab is hidden.
 */

const VISIBLE = 3;
const PEEK = 12;
const GAP = 10;
const LEAVE_MS = 260;

type Rendered = ToastItem & { leaving?: boolean };

export default function Toaster() {
  const [list, setList] = useState<Rendered[]>([]);
  const [spread, setSpread] = useState(false);
  const [heights, setHeights] = useState<Record<number, number>>({});

  // dev only: lets automated checks fire toasts (stripped from production builds)
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") (window as unknown as { __toast: typeof toast }).__toast = toast;
  }, []);

  // mirror the store, keeping removed toasts around just long enough to animate out
  useEffect(
    () =>
      subscribeToasts((items) => {
        setList((prev) => {
          const live = new Set(items.map((i) => i.id));
          const leaving = prev.filter((p) => !live.has(p.id));
          // schedule removal once, when a toast first starts leaving
          leaving.filter((p) => !p.leaving).forEach((p) => setTimeout(() => setList((l) => l.filter((x) => x.id !== p.id)), LEAVE_MS));
          return [...items, ...leaving.map((p) => ({ ...p, leaving: true }))];
        });
      }),
    []
  );

  const onHeight = useCallback((id: number, h: number) => setHeights((s) => (s[id] === h ? s : { ...s, [id]: h })), []);

  const live = list.filter((t) => !t.leaving);
  if (!list.length) return <section className="toaster" aria-label="Notifications" />;

  // stack geometry: collapsed = peek behind the newest; spread = a column of real heights
  let offset = 0;
  const pos = new Map<number, { y: number; depth: number }>();
  live.forEach((t, depth) => {
    pos.set(t.id, { y: spread ? -offset : -depth * PEEK, depth });
    offset += (heights[t.id] ?? 72) + GAP;
  });
  const frontH = heights[live[0]?.id] ?? 72;
  const spreadH = Math.min(live.length, VISIBLE) > 1 ? live.slice(0, VISIBLE).reduce((s, t) => s + (heights[t.id] ?? 72) + GAP, 0) : frontH;

  return (
    <section
      className="toaster"
      aria-label="Notifications"
      style={{ ["--stack-h" as string]: `${spread ? spreadH : frontH}px` }}
      onPointerEnter={() => setSpread(true)}
      onPointerLeave={() => setSpread(false)}
      onFocus={() => setSpread(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setSpread(false)}
    >
      <ol>
        {list.map((t) => {
          const p = pos.get(t.id);
          const depth = p?.depth ?? 0;
          return (
            <ToastView
              key={t.id}
              t={t}
              depth={depth}
              y={p?.y ?? 0}
              hidden={!t.leaving && depth >= VISIBLE}
              spread={spread}
              paused={spread}
              onHeight={onHeight}
            />
          );
        })}
      </ol>
    </section>
  );
}

function ToastView({
  t,
  depth,
  y,
  hidden,
  spread,
  paused,
  onHeight,
}: {
  t: Rendered;
  depth: number;
  y: number;
  hidden: boolean;
  spread: boolean;
  paused: boolean;
  onHeight: (id: number, h: number) => void;
}) {
  const el = useRef<HTMLLIElement>(null);
  const [swipe, setSwipe] = useState(0);
  const [gone, setGone] = useState<"left" | "right" | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; id: number } | null>(null);
  const remaining = useRef(t.duration);

  // enter: start from the pre-open state, flush it, release it in the same task
  useLayoutEffect(() => {
    const node = el.current;
    if (!node) return;
    node.classList.add("is-enter");
    void node.offsetWidth;
    node.classList.remove("is-enter");
    onHeight(t.id, node.offsetHeight);
    const ro = new ResizeObserver(() => onHeight(t.id, node.offsetHeight));
    ro.observe(node);
    return () => ro.disconnect();
  }, [t.id, onHeight]);

  // auto-dismiss, paused while hovered/focused or the tab is hidden
  useEffect(() => {
    if (t.leaving || paused) return;
    let started = Date.now();
    let timer = setTimeout(() => toast.dismiss(t.id), remaining.current);
    const onVis = () => {
      if (document.hidden) {
        clearTimeout(timer);
        remaining.current -= Date.now() - started;
      } else {
        started = Date.now();
        timer = setTimeout(() => toast.dismiss(t.id), Math.max(800, remaining.current));
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - started;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [paused, t.id, t.leaving]);

  const scale = spread || depth === 0 ? 1 : 1 - depth * 0.05;
  const style = {
    ["--y" as string]: `${y}px`,
    ["--s" as string]: String(scale),
    ["--swipe" as string]: `${swipe}px`,
    zIndex: 10 - depth,
  };

  const isAlert = t.kind === "error" || t.kind === "alert";

  return (
    <li
      ref={el}
      className={`toast toast--${t.kind}${t.leaving ? " is-leaving" : ""}${gone ? ` is-swiped-${gone}` : ""}${!spread && depth > 0 ? " is-behind" : ""}${hidden ? " is-hidden" : ""}${dragging ? " is-dragging" : ""}`}
      style={style}
      role={isAlert ? "alert" : "status"}
      aria-live={isAlert ? "assertive" : "polite"}
      aria-atomic="true"
      data-depth={depth}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("a,button")) return;
        drag.current = { x: e.clientX, id: e.pointerId };
        setDragging(true);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => drag.current && setSwipe(e.clientX - drag.current.x)}
      onPointerUp={() => {
        if (!drag.current) return;
        drag.current = null;
        setDragging(false);
        if (Math.abs(swipe) > 70) {
          setGone(swipe > 0 ? "right" : "left");
          toast.dismiss(t.id);
        }
        setSwipe(0);
      }}
      onPointerCancel={() => {
        drag.current = null;
        setDragging(false);
        setSwipe(0);
      }}
    >
      <span className="toast__icon" aria-hidden="true">
        {t.kind === "success" && (
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10.25" className="toast__ring" />
            <path d="M7.4 12.4l3.1 3.1 6.1-6.4" className="toast__tick" />
          </svg>
        )}
        {t.kind === "error" && (
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10.25" className="toast__ring" />
            <path d="M12 7.2v6.1M12 16.6v.2" className="toast__mark" />
          </svg>
        )}
        {t.kind === "info" && (
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10.25" className="toast__ring" />
            <path d="M12 11v5.6M12 7.6v.2" className="toast__mark" />
          </svg>
        )}
        {t.kind === "alert" && (
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M6.3 10a5.7 5.7 0 0 1 11.4 0c0 4.2 1.5 6 2.1 6.6H4.2c.6-.6 2.1-2.4 2.1-6.6zM9.9 19.4c.4 1 1.2 1.5 2.1 1.5s1.7-.5 2.1-1.5" className="toast__mark" />
          </svg>
        )}
      </span>
      <div className="toast__body">
        <p className="toast__title">{t.title}</p>
        {t.description && <p className="toast__desc">{t.description}</p>}
        {t.action &&
          (t.action.href ? (
            <a className="toast__action" href={t.action.href} onClick={() => toast.dismiss(t.id)}>
              {t.action.label}
            </a>
          ) : (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                t.action?.onClick?.();
                toast.dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          ))}
      </div>
      <button type="button" className="toast__close" aria-label="Dismiss notification" onClick={() => toast.dismiss(t.id)}>
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </li>
  );
}
