import gsap from "gsap";
import { F, type SceneApi, type SceneOpts } from "./protocol";
import { CAM_Z, FOV, K, L, P, S, isMobile, vis, type Tier } from "./state";

/**
 * Main-thread controller for the 3D shield. It never imports Three.js itself:
 * it computes the pose and light values each frame (cheap arithmetic) and hands
 * them to the renderer — inside a Web Worker on an OffscreenCanvas wherever the
 * browser supports it, otherwise a main-thread fallback.
 */
type Renderer = {
  send: (st: Float32Array) => void;
  resize: (w: number, h: number) => void;
  handle: [number, number];
};

async function startWorker(canvas: HTMLCanvasElement, opts: SceneOpts): Promise<Renderer> {
  const worker = new Worker(new URL("./render.worker.ts", import.meta.url), { type: "module" });
  const offscreen = canvas.transferControlToOffscreen();
  const r: Renderer = {
    handle: [0.6, -0.4],
    send: (st) => worker.postMessage({ type: "state", state: st }),
    resize: (w, h) => worker.postMessage({ type: "resize", w, h }),
  };
  await new Promise<void>((resolve, reject) => {
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.type === "handle") r.handle = [m.x, m.y];
      else if (m.type === "ready") resolve();
      else if (m.type === "error") reject(new Error(m.message));
    };
    worker.onerror = (e) => reject(e);
    worker.postMessage({ type: "init", canvas: offscreen, opts }, [offscreen]);
  });
  return r;
}

async function startMainThread(canvas: HTMLCanvasElement, opts: SceneOpts): Promise<Renderer> {
  const { createScene } = await import("./scene");
  const api: SceneApi = await createScene(canvas, opts);
  const r: Renderer = {
    handle: [0.6, -0.4],
    send: (st) => (r.handle = api.render(st)),
    resize: api.resize,
  };
  return r;
}

export async function initExperience(canvas: HTMLCanvasElement, tier: Tier) {
  const root = document.documentElement;
  const stage = canvas.parentElement as HTMLElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const opts: SceneOpts = {
    width: canvas.clientWidth || innerWidth,
    height: canvas.clientHeight || innerHeight,
    dpr: Math.min(devicePixelRatio, tier === "high" ? 2 : 1.5),
    lite: tier !== "high",
    fov: FOV,
  };

  let r: Renderer;
  try {
    r =
      "transferControlToOffscreen" in canvas && typeof Worker !== "undefined"
        ? await startWorker(canvas, opts)
        : await startMainThread(canvas, opts);
  } catch (err) {
    console.warn("[stage] 3D unavailable, using the emblem fallback", err);
    root.dataset.tier = "low";
    return;
  }

  new ResizeObserver(() => r.resize(canvas.clientWidth, canvas.clientHeight)).observe(canvas);

  // intro values, animated here and streamed to the renderer
  const I = { camZ: CAM_Z + 2.5, reveal: 2.4, draw: 0, lineOpacity: 0.95, ignite: 0 };
  const heroY = () => (isMobile() ? vis().h * 0.22 : vis().h * 0.08);
  if (S.x === 0 && S.y === 0) S.y = heroY();
  const baseScale = () => {
    const { h, w } = vis();
    return Math.min((0.46 * h) / 3.74, ((isMobile() ? 0.5 : 0.6) * w) / 2.87);
  };

  // wordmark box only changes on resize — cache it (measuring every frame forces layout)
  const mark = document.querySelector<HTMLElement>(".mark");
  let markRect = mark?.getBoundingClientRect();
  if (mark) new ResizeObserver(() => (markRect = mark.getBoundingClientRect())).observe(mark);

  // CSS variables live on .stage (not :root, which would restyle the whole page)
  // and are only written when they change
  const last: Record<string, string> = {};
  const setVar = (el: HTMLElement, k: string, v: string) => {
    if (last[k] === v) return;
    last[k] = v;
    el.style.setProperty(k, v);
  };

  const st = new Float32Array(F.SIZE);
  const t0 = performance.now();
  let prev = t0;

  const frame = () => {
    const now = performance.now();
    const dt = Math.min((now - prev) / 1000, 0.05);
    prev = now;
    const t = (now - t0) / 1000;

    // idle → the lamp drifts by itself
    const idle = now - P.lastMove > 2600;
    const gx = idle ? Math.sin(t * 0.35) * 0.55 : P.tx;
    const gy = idle ? Math.sin(t * 0.52 + 1.3) * 0.35 : P.ty;
    const k = 1 - Math.pow(0.0015, dt);
    P.x += (gx - P.x) * k;
    P.y += (gy - P.y) * k;

    const v = vis();
    let x = S.x,
      y = S.y + K.lift * v.h * 0.75,
      sc = S.scale,
      ry = S.rotY,
      rx = S.rotX;
    if (K.cta > 0) {
      // the bookend pose takes over while the shield is off-screen, so the swap is invisible
      const e = 1 - Math.pow(1 - K.cta, 3);
      x = isMobile() ? 0 : v.w * 0.24;
      y = (isMobile() ? v.h * 0.2 : 0.1) - (1 - e) * v.h * 0.75;
      sc = isMobile() ? 0.6 : 0.85;
      ry = -0.3 + (1 - e) * Math.PI * 2;
      rx = 0;
    }

    st[F.px] = x;
    st[F.py] = y;
    st[F.pz] = S.z;
    st[F.scale] = sc * baseScale();
    st[F.ry] = ry + P.x * 0.38 * S.follow + Math.sin(t * 0.4) * 0.03;
    st[F.rx] = rx - P.y * 0.22 * S.follow + Math.sin(t * 0.3) * 0.02;
    st[F.lampX] = P.x;
    st[F.lampY] = P.y;
    st[F.lamp] = L.lamp;
    st[F.torch] = L.torch;
    st[F.time] = reduced ? 0 : t;
    st[F.reveal] = I.reveal;
    st[F.draw] = I.draw;
    st[F.lineOpacity] = I.lineOpacity;
    st[F.ignite] = I.ignite;
    st[F.camZ] = I.camZ;
    st[F.covered] = K.covered;
    r.send(st);

    if (!K.covered) {
      const [hx, hy] = r.handle;
      setVar(stage, "--tx", `${Math.round(((hx + 1) / 2) * innerWidth)}px`);
      setVar(stage, "--ty", `${Math.round(((1 - hy) / 2) * innerHeight)}px`);
    }
    if (mark && markRect && markRect.width) {
      const mx = ((((P.x + 1) / 2) * innerWidth - markRect.left) / markRect.width) * 100;
      const my = ((((1 - P.y) / 2) * innerHeight - markRect.top) / markRect.height) * 100;
      setVar(mark, "--mx", `${mx.toFixed(1)}%`);
      setVar(mark, "--my", `${my.toFixed(1)}%`);
    }
    setVar(stage, "--lamp", L.lamp.toFixed(2));
    setVar(stage, "--ignite", L.torch.toFixed(2));
  };

  root.dataset.stage = "ready";
  gsap.ticker.add(frame);

  // ── intro: draft → reveal → ignite (the headline is already on screen; only the stage animates) ──
  if (reduced) {
    Object.assign(I, { camZ: CAM_Z, reveal: -2.4, draw: 1, lineOpacity: 0, ignite: 1 });
    L.torch = 1;
    L.lamp = 1;
    return;
  }
  gsap
    .timeline({ defaults: { ease: "power3.out" } })
    .to(I, { camZ: CAM_Z, duration: 4, ease: "power2.out" }, 0)
    .to(I, { draw: 1, duration: 1.8, ease: "power2.inOut" }, 0.1)
    .to(I, { reveal: -2.4, duration: 1.4, ease: "expo.inOut" }, 1.2)
    .to(I, { lineOpacity: 0, duration: 0.9, ease: "power1.out" }, 1.9)
    .to(L, { torch: 1, duration: 1.4, ease: "power2.out" }, 2.2)
    .to(I, { ignite: 1, duration: 1.5, ease: "power3.inOut" }, 2.25)
    .to(L, { lamp: 1, duration: 1.6, ease: "power2.out" }, 2.7);
}
