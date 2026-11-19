"use client";

/**
 * Custom next/image loader: serves pre-generated WebP variants
 * (scripts/build-images.mjs → public/img/<name>-<width>.webp) instead of a hosted
 * optimisation service, so images can't break when a provider quota runs out.
 *
 * - Photos imported from src/assets/photos arrive as /_next/static/…/media/<name>.<hash>.<ext>
 *   and are mapped to the smallest variant at least as wide as requested.
 * - Anything else (book sample pages, already-optimised WebP in /public) is served as-is.
 */
const WIDTHS = [160, 480, 800, 1200, 1760];

export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }) {
  const m = src.match(/\/_next\/static\/(?:immutable\/)?media\/([a-z0-9-]+)\.[a-z0-9]+\.(?:jpe?g|png|webp)$/i);
  if (!m) return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
  const w = WIDTHS.find((v) => v >= width) ?? WIDTHS[WIDTHS.length - 1];
  return `/img/${m[1]}-${w}.webp`;
}
