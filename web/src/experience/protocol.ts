/** Shared between the main-thread controller and the renderer (no Three.js imports here). */

/** Layout of the per-frame state buffer shared by controller and renderer. */
export const F = {
  px: 0,
  py: 1,
  pz: 2,
  scale: 3,
  rx: 4,
  ry: 5,
  lampX: 6,
  lampY: 7,
  lamp: 8,
  torch: 9,
  time: 10,
  reveal: 11,
  draw: 12,
  lineOpacity: 13,
  ignite: 14,
  camZ: 15,
  covered: 16,
  SIZE: 17,
} as const;

export type SceneOpts = { width: number; height: number; dpr: number; lite: boolean; fov: number };
export type SceneApi = {
  /** draws one frame; returns the torch handle in normalised device coords */
  render: (st: Float32Array) => [number, number];
  resize: (w: number, h: number) => void;
};

