import type { Tier } from "./state";

/**
 * Decide how much of the experience a device gets.
 *  high — full materials, DPR ≤ 2
 *  mid  — lighter materials, DPR ≤ 1.5 (low-memory / few-core phones)
 *  low  — no WebGL: the animated SVG emblem (reduced motion, Save-Data,
 *         no WebGL, or a software renderer that can't hold frame rate)
 * `?tier=high|mid|low` overrides, for testing.
 */
export function detectTier(): Tier {
  const forced = new URLSearchParams(location.search).get("tier");
  if (forced === "high" || forced === "mid" || forced === "low") return forced;

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return "low";
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) return "low";

  let renderer = "";
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return "low";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    return "low";
  }
  if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) return "low";
  if (/mali-4|mali-t6|adreno \(tm\) [23]\d\d|powervr sgx/i.test(renderer)) return "low";

  const mem = nav.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  if (mem <= 3 || cores <= 4) return "mid";
  return "high";
}
