"use client";

import { useEffect } from "react";
import { track, type StoreEvent } from "@/lib/analytics";

/** Fires one analytics event when a page mounts. Renders nothing. */
export default function TrackView({ event, slug }: { event: StoreEvent; slug?: string }) {
  useEffect(() => track(event, slug ? { slug } : {}), [event, slug]);
  return null;
}
