/**
 * Shared, mutable animation state. The scroll story (always loaded) writes it,
 * the WebGL experience (lazy-loaded, high/mid tier only) reads it every frame.
 */
export type Tier = "high" | "mid" | "low";

/** shield pose written by the chapter timeline */
export const S = { x: 0, y: 0, z: 0, rotY: 0, rotX: 0, scale: 1, follow: 1 };
/** section blend weights: lift = first vellum section covering, cta = bookend */
export const K = { lift: 0, cta: 0, covered: 0 };
/** light levels */
export const L = { lamp: 0, torch: 0 };
/** pointer / tilt target in -1..1 */
export const P = { x: 0, y: 0, tx: 0, ty: 0, lastMove: -1e9 };

export const CAM_Z = 11.5;
export const FOV = 30;

export const isMobile = () => window.innerWidth < 760;

/** visible world size at the resting camera distance */
export const vis = () => {
  const h = 2 * CAM_Z * Math.tan(((FOV / 2) * Math.PI) / 180);
  return { h, w: h * (window.innerWidth / window.innerHeight) };
};
