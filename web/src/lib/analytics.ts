/**
 * First-party, cookieless store analytics (PROJECT_PLAN §4.1).
 * An anonymous session id lives in sessionStorage only; no cookies, no IPs.
 * Events go to /api/events with sendBeacon so they never block the page.
 */
export type StoreEvent =
  | "store_view"
  | "book_view"
  | "sample_open"
  | "sample_page"
  | "sample_complete"
  | "checkout_start"
  | "checkout_submit"
  | "payment_success";

const sid = () => {
  try {
    let id = sessionStorage.getItem("nl_sid");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("nl_sid", id);
    }
    return id;
  } catch {
    return "anon";
  }
};

const recent = new Map<string, number>();

export function track(event: StoreEvent, props: { slug?: string; n?: number; currency?: string } = {}) {
  if (typeof window === "undefined") return;
  // never count the same event twice in quick succession (double effects, double clicks)
  const key = `${event}|${props.slug ?? ""}|${props.n ?? ""}`;
  const now = Date.now();
  if (now - (recent.get(key) ?? 0) < 1500) return;
  recent.set(key, now);
  const params = new URLSearchParams(location.search);
  const body = JSON.stringify({
    e: event,
    sid: sid(),
    ...props,
    ref: document.referrer ? new URL(document.referrer).hostname : undefined,
    utm: params.get("utm_source") ?? undefined,
    m: matchMedia("(pointer: coarse)").matches ? "mobile" : "desktop",
  });
  try {
    if (!navigator.sendBeacon?.("/api/events", new Blob([body], { type: "application/json" }))) {
      fetch("/api/events", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
    }
  } catch {
    /* analytics must never break the page */
  }
}
