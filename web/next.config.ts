import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: { formats: ["image/avif", "image/webp"] },
  // dev only: let a phone on the same private network open the dev server (review sessions)
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "172.*.*.*"],
  // review deployments: a belt-and-braces noindex header on every response
  async headers() {
    return process.env.SITE_NOINDEX === "1" ? [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }] : [];
  },
};

export default nextConfig;
