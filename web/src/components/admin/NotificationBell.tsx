"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { readNotifications } from "@/app/admin/actions/notifications";
import { toast } from "@/lib/toast";
import type { NotificationRow } from "@/lib/admin/notifications";

type Feed = { items: NotificationRow[]; unread: number; ready: boolean };
const POLL_MS = 30_000;

const KIND_LABEL: Record<NotificationRow["kind"], string> = {
  order_paid: "Sale",
  enquiry_new: "Enquiry",
  delivery_failed: "Needs action",
  order_refunded: "Refund",
};

const lagosDay = (iso: string) => new Date(new Date(iso).getTime() + 3600_000).toISOString().slice(0, 10);
function groupOf(iso: string) {
  const today = lagosDay(new Date().toISOString());
  const yesterday = lagosDay(new Date(Date.now() - 86400_000).toISOString());
  const d = lagosDay(iso);
  return d === today ? "Today" : d === yesterday ? "Yesterday" : "Earlier";
}
function ago(iso: string) {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" });
}

/**
 * The workspace bell. Incoming events land here, quietly: the badge counts what's
 * unread, new arrivals get a soft highlight, and nothing pops over her work.
 */
export default function NotificationBell() {
  const router = useRouter();
  const [feed, setFeed] = useState<Feed | null>(null);
  const [open, setOpen] = useState(false);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const seen = useRef<Set<string> | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const baseTitle = useRef<string>("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/admin/notifications", { cache: "no-store" });
      if (!r.ok) return;
      const f = (await r.json()) as Feed;
      // anything not seen before (after the first load) is "fresh" — highlighted once
      if (seen.current) {
        const arrivals = f.items.filter((i) => !seen.current!.has(i.id));
        const added = arrivals.map((i) => i.id);
        if (added.length) {
          setFresh((s) => new Set([...s, ...added]));
          router.refresh(); // the page behind updates too (new order, new enquiry)
          // and a quiet toast so she sees it without opening the bell
          const n = arrivals[0];
          if (arrivals.length === 1) toast.alert(n.title, { description: n.body ?? undefined, action: n.href ? { label: "Open", href: n.href } : undefined });
          else toast.alert(`${arrivals.length} new notifications`, { description: arrivals.map((a) => a.title).slice(0, 3).join(" · "), action: { label: "View", onClick: () => setOpen(true) } });
        }
      }
      seen.current = new Set(f.items.map((i) => i.id));
      setFeed(f);
    } catch {
      /* offline for a moment: try again next tick */
    }
  }, [router]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const tick = setInterval(() => document.visibilityState === "visible" && load(), POLL_MS);
    const onFocus = () => load();
    addEventListener("focus", onFocus);
    return () => {
      clearTimeout(first);
      clearInterval(tick);
      removeEventListener("focus", onFocus);
    };
  }, [load]);

  // "(2) Overview · Admin" in the browser tab while something is unread
  useEffect(() => {
    if (!baseTitle.current) baseTitle.current = document.title.replace(/^\(\d+\+?\)\s*/, "");
    const n = feed?.unread ?? 0;
    const clean = document.title.replace(/^\(\d+\+?\)\s*/, "");
    document.title = n ? `(${n > 9 ? "9+" : n}) ${clean}` : clean;
  }, [feed?.unread]);

  // close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("pointerdown", onDown);
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("pointerdown", onDown);
      removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = feed?.unread ?? 0;
  const markAll = async () => {
    setFeed((f) => f && { ...f, unread: 0, items: f.items.map((i) => ({ ...i, read_at: i.read_at ?? new Date().toISOString() })) });
    await readNotifications("all");
  };
  const openItem = async (n: NotificationRow) => {
    setOpen(false);
    if (!n.read_at) {
      setFeed((f) => f && { ...f, unread: Math.max(0, f.unread - 1), items: f.items.map((i) => (i.id === n.id ? { ...i, read_at: new Date().toISOString() } : i)) });
      readNotifications([n.id]);
    }
    if (n.href) router.push(n.href);
  };

  const groups = ["Today", "Yesterday", "Earlier"]
    .map((g) => [g, (feed?.items ?? []).filter((i) => groupOf(i.created_at) === g)] as const)
    .filter(([, items]) => items.length);

  return (
    <div className="a-bell" ref={root}>
      <button
        type="button"
        className={`a-bell__btn${unread ? " a-bell__btn--on" : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5.25 8.25a4.75 4.75 0 0 1 9.5 0c0 3.5 1.25 5 1.75 5.5H3.5c.5-.5 1.75-2 1.75-5.5zM8.25 16.25c.35.9 1 1.25 1.75 1.25s1.4-.35 1.75-1.25" />
        </svg>
        {unread > 0 && (
          <span className="a-bell__count" key={unread}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="a-bell__panel" role="dialog" aria-label="Notifications">
          <div className="a-bell__head">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button type="button" className="a-bell__link" onClick={markAll}>
                Mark all as read
              </button>
            )}
          </div>
          <div className="a-bell__list">
            {!feed?.ready ? (
              <p className="a-bell__empty">Notifications switch on once the last database update has been run (Settings explains).</p>
            ) : groups.length === 0 ? (
              <p className="a-bell__empty">
                You&rsquo;re all caught up.
                <span>New sales, enquiries and anything that needs you will appear here.</span>
              </p>
            ) : (
              groups.map(([g, items]) => (
                <section key={g}>
                  <h3 className="a-bell__group">{g}</h3>
                  <ul>
                    {items.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          className={`a-note-item a-note-item--${n.kind}${n.read_at ? "" : " a-note-item--unread"}${fresh.has(n.id) ? " a-note-item--fresh" : ""}`}
                          onClick={() => openItem(n)}
                        >
                          <span className="a-note-item__kind">{KIND_LABEL[n.kind]}</span>
                          <span className="a-note-item__title">{n.title}</span>
                          {n.body && <span className="a-note-item__body">{n.body}</span>}
                          <span className="a-note-item__time">{ago(n.created_at)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
          <a className="a-bell__foot" href="/admin/settings#alerts">
            Email alerts &amp; preferences
          </a>
        </div>
      )}
    </div>
  );
}
