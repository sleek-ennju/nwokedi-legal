import { createScene } from "./scene";
import { F, type SceneApi } from "./protocol";

/**
 * Off-main-thread renderer. Three.js is parsed, shaders are compiled and every
 * frame is drawn here, so the page's main thread stays free for input and scroll.
 */
// minimal worker-scope typing (the "webworker" lib would clash with the DOM lib project-wide)
type WorkerScope = {
  postMessage: (msg: unknown) => void;
  onmessage: ((e: MessageEvent) => void) | null;
  requestAnimationFrame?: (cb: () => void) => number;
};
const ctx = self as unknown as WorkerScope;
let api: SceneApi | null = null;
let latest: Float32Array | null = null;
let dirty = false;

const raf: (cb: () => void) => void =
  typeof ctx.requestAnimationFrame === "function" ? (cb) => ctx.requestAnimationFrame!(cb) : (cb) => setTimeout(cb, 16);

const loop = () => {
  if (api && latest && dirty && !latest[F.covered]) {
    dirty = false;
    const [x, y] = api.render(latest);
    ctx.postMessage({ type: "handle", x, y });
  }
  raf(loop);
};

ctx.onmessage = async (e: MessageEvent) => {
  const m = e.data;
  if (m.type === "init") {
    try {
      api = await createScene(m.canvas as OffscreenCanvas, m.opts);
      ctx.postMessage({ type: "ready" });
      raf(loop);
    } catch (err) {
      ctx.postMessage({ type: "error", message: String(err) });
    }
  } else if (m.type === "state") {
    latest = m.state as Float32Array;
    dirty = true;
  } else if (m.type === "resize") {
    api?.resize(m.w, m.h);
    dirty = true;
  }
};
