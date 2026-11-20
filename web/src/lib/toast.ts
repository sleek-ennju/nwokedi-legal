/**
 * A tiny toast store (no library). Call from any client component:
 *   toast.success("Saved", { description: "It's live on the site." })
 *   toast.error("That didn't work", { description: "Try again in a moment." })
 *   toast.alert("New enquiry", { action: { label: "View", href: "/admin/enquiries" } })
 * The <Toaster /> in the root layout renders them.
 */

export type ToastKind = "success" | "error" | "info" | "alert";
export type ToastAction = { label: string; href?: string; onClick?: () => void };
export type ToastItem = {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
  action?: ToastAction;
  /** ms before it leaves on its own (paused while hovered or the tab is hidden) */
  duration: number;
};

type Opts = { description?: string; action?: ToastAction; duration?: number };
type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l(items));

const DEFAULT_MS: Record<ToastKind, number> = { success: 4200, info: 4200, error: 7000, alert: 8000 };

function push(kind: ToastKind, title: string, opts: Opts = {}) {
  const id = nextId++;
  const duration = opts.duration ?? (opts.action ? Math.max(DEFAULT_MS[kind], 7000) : DEFAULT_MS[kind]);
  // the same message twice in a row replaces the first instead of stacking
  items = [{ id, kind, title, description: opts.description, action: opts.action, duration }, ...items.filter((t) => !(t.title === title && t.kind === kind))].slice(0, 6);
  emit();
  return id;
}

export const toast = Object.assign((title: string, opts?: Opts) => push("info", title, opts), {
  success: (title: string, opts?: Opts) => push("success", title, opts),
  error: (title: string, opts?: Opts) => push("error", title, opts),
  info: (title: string, opts?: Opts) => push("info", title, opts),
  /** something arrived that isn't the result of their own click (e.g. a new enquiry) */
  alert: (title: string, opts?: Opts) => push("alert", title, opts),
  dismiss: (id: number) => {
    items = items.filter((t) => t.id !== id);
    emit();
  },
});

export function subscribeToasts(l: Listener) {
  listeners.add(l);
  l(items);
  return () => {
    listeners.delete(l);
  };
}
