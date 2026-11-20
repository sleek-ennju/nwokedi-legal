"use client";

import { useEffect } from "react";
import { toast, type ToastKind } from "@/lib/toast";

/** Fire one toast when a server-rendered page lands in a given state (e.g. "payment confirmed"). */
export default function ToastOnMount({ kind, title, description }: { kind: Exclude<ToastKind, "alert">; title: string; description?: string }) {
  useEffect(() => {
    toast[kind](title, { description });
  }, [kind, title, description]);
  return null;
}
