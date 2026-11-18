import "./style.css";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { buildShield, type Shield } from "./shield";

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = () => innerWidth < 760;

/* ───────────────────── Smooth scroll ───────────────────── */
const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
if (import.meta.env.DEV) Object.assign(window, { lenis });
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href")!;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    lenis.scrollTo(el as HTMLElement, { duration: 1.6 });
  })
);

/* ───────────────────── Renderer ───────────────────── */
const canvas = document.getElementById("gl") as HTMLCanvasElement;
let renderer: THREE.WebGLRenderer | null = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
} catch {
  root.classList.add("no-webgl");
}

/** Values the scroll timeline writes and the render loop reads. */
const S = { x: 0, y: 0, z: 0, rotY: 0, rotX: 0, scale: 1, follow: 1 };
/** Pointer / lamp state (normalised -1..1). */
const P = { x: 0, y: 0, tx: 0, ty: 0, sx: innerWidth / 2, sy: innerHeight / 2, lastMove: 0 };
const L = { lamp: 0, torch: 0 };
/** Section blend weights: lift = vellum covering, cta = contact bookend. */
const K = { lift: 0, cta: 0 };

const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 14);

const scene = new THREE.Scene();
const pivot = new THREE.Group();
scene.add(pivot);

const clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -3);
const reveal = { c: 2.4 }; // clip line sweeps top → bottom

let shield: Shield | null = null;
const torchLight = new THREE.PointLight("#ffb547", 0, 5, 1.4);
const lampLight = new THREE.PointLight("#fff0d6", 0, 10, 1.3);

/** visible world size at the resting camera distance */
const vis = () => {
  const h = 2 * 11.5 * Math.tan(THREE.MathUtils.degToRad(15));
  return { h, w: h * (innerWidth / innerHeight) };
};
/** shield fills ~46% of the viewport height, never more than 60% of the width */
function baseScale() {
  const { h, w } = vis();
  return Math.min((0.46 * h) / 3.74, ((mobile() ? 0.5 : 0.6) * w) / 2.87);
}
const heroY = () => (mobile() ? vis().h * 0.22 : vis().h * 0.08);
S.y = heroY();

async function initScene() {
  if (!renderer) return;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.localClippingEnabled = true;

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;

  const key = new THREE.DirectionalLight("#ffe2bd", 1.6);
  key.position.set(-3, 4, 6);
  const rim = new THREE.DirectionalLight("#7d95c9", 1.1);
  rim.position.set(4, -2, -4);
  scene.add(key, rim, lampLight);

  shield = await buildShield("/brand/emblem.svg", [clipPlane]);
  pivot.add(shield.group);
  shield.handleAnchor.add(torchLight);
}

/* ───────────────────── Pointer = the lamp ───────────────────── */
function onPoint(x: number, y: number) {
  P.tx = (x / innerWidth) * 2 - 1;
  P.ty = -((y / innerHeight) * 2 - 1);
  P.lastMove = performance.now();
}
addEventListener("pointermove", (e) => onPoint(e.clientX, e.clientY), { passive: true });
addEventListener("touchmove", (e) => onPoint(e.touches[0].clientX, e.touches[0].clientY), { passive: true });

/* ───────────────────── Render loop ───────────────────── */
const tmp = new THREE.Vector3();
const clock = new THREE.Clock();

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // when idle (or on touch with no drag), the lamp drifts on its own
  const idle = performance.now() - P.lastMove > 2600;
  const gx = idle ? Math.sin(t * 0.35) * 0.55 : P.tx;
  const gy = idle ? Math.sin(t * 0.52 + 1.3) * 0.35 : P.ty;
  const k = 1 - Math.pow(0.0015, dt);
  P.x += (gx - P.x) * k;
  P.y += (gy - P.y) * k;

  if (renderer && shield) {
    const bs = baseScale();
    const v = vis();
    let x = S.x,
      y = S.y + K.lift * v.h * 0.75,
      sc = S.scale,
      ry = S.rotY,
      rx = S.rotX;
    if (K.cta > 0) {
      // swapped while the shield is off-screen, so the hand-over is invisible
      const ease = 1 - Math.pow(1 - K.cta, 3);
      x = mobile() ? 0 : v.w * 0.24;
      y = (mobile() ? v.h * 0.22 : 0.1) - (1 - ease) * v.h * 0.75;
      sc = mobile() ? 0.6 : 0.85;
      ry = -0.3 + (1 - ease) * Math.PI * 2;
      rx = 0;
    }
    pivot.position.set(x, y, S.z);
    pivot.scale.setScalar(sc * bs);
    pivot.rotation.y = ry + P.x * 0.38 * S.follow + Math.sin(t * 0.4) * 0.03;
    pivot.rotation.x = rx - P.y * 0.22 * S.follow + Math.sin(t * 0.3) * 0.02;

    lampLight.position.set(P.x * 3.4, P.y * 2.2, 4.2);
    lampLight.intensity = L.lamp * 1.8;
    torchLight.intensity = L.torch * (1.4 + Math.sin(t * 9) * 0.12 + Math.sin(t * 23) * 0.08);
    shield.gold.emissiveIntensity = L.torch * 0.45;
    shield.red.emissiveIntensity = L.torch * 0.06;
    shield.uniforms.uTime.value = reduced ? 0 : t;
    clipPlane.constant = -reveal.c;

    // nothing to draw while the vellum section fully covers the stage
    if (!(K.lift >= 0.999 && K.cta === 0)) renderer.render(scene, camera);

    // project the torch handle to screen for the CSS glow
    shield.handleAnchor.getWorldPosition(tmp).project(camera);
    root.style.setProperty("--tx", `${((tmp.x + 1) / 2) * innerWidth}px`);
    root.style.setProperty("--ty", `${((1 - tmp.y) / 2) * innerHeight}px`);
  }

  // lamp position over the wordmark (percent inside the .mark box)
  const markEl = mark;
  if (markEl) {
    const r = markEl.getBoundingClientRect();
    const sx = ((P.x + 1) / 2) * innerWidth;
    const sy = ((1 - P.y) / 2) * innerHeight;
    markEl.style.setProperty("--mx", `${((sx - r.left) / r.width) * 100}%`);
    markEl.style.setProperty("--my", `${((sy - r.top) / r.height) * 100}%`);
  }
  root.style.setProperty("--lamp", L.lamp.toFixed(3));
  root.style.setProperty("--ignite", L.torch.toFixed(3));
}
const mark = document.querySelector<HTMLElement>(".mark");

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer?.setSize(innerWidth, innerHeight, false);
}
addEventListener("resize", onResize);

/* ───────────────────── Intro: draft → reveal → ignite ───────────────────── */
function intro() {
  const draw = { p: 0 };
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  tl.to(camera.position, { z: 11.5, duration: 4.2, ease: "power2.out" }, 0)
    // the wordmark waits in the dark until the torch catches
    .fromTo(".mark", { opacity: 0 }, { opacity: 1, duration: 2.4, ease: "power2.inOut" }, 2.3)
    .to(draw, { p: 1, duration: 1.9, ease: "power2.inOut", onUpdate: () => shield?.setDraw(draw.p) }, 0.15)
    .to(reveal, { c: -2.4, duration: 1.5, ease: "expo.inOut" }, 1.35)
    .to(shield!.lineMat, { opacity: 0, duration: 0.9, ease: "power1.out" }, 2.1)
    // ignition: handle catches, the flame burns along the ribbons
    .to(L, { torch: 1, duration: 1.4, ease: "power2.out" }, 2.45)
    .to(shield!.uniforms.uIgnite, { value: 1, duration: 1.5, ease: "power3.inOut" }, 2.5)
    .to(L, { lamp: 1, duration: 1.6, ease: "power2.out" }, 3.0)
    .to(".line > span", { y: 0, duration: 1.3, stagger: 0.09, ease: "expo.out" }, 2.9)
    .to("[data-intro]", { opacity: 1, duration: 1.1, stagger: 0.08, ease: "power1.out" }, 3.4)
    .to(".lit", { backgroundPosition: "0% 0", duration: 2.2, ease: "power2.inOut" }, 3.1)
    .add(() => {
      root.classList.remove("is-loading");
      lenis.start();
    }, 3.6);
  return tl;
}

function skipIntro() {
  camera.position.z = 11.5;
  shield?.setDraw(1);
  if (shield) {
    shield.lineMat.opacity = 0;
    shield.uniforms.uIgnite.value = 1;
  }
  reveal.c = -2.4;
  L.torch = 1;
  L.lamp = 1;
  gsap.set(".line > span", { y: 0 });
  gsap.set(".lit", { backgroundPosition: "0% 0" });
  root.classList.remove("is-loading");
  lenis.start();
}

/* ───────────────────── Scroll choreography ───────────────────── */
function scrollStory() {
  const chapters = gsap.utils.toArray<HTMLElement>(".chapter");
  const fill = document.querySelector<HTMLElement>(".rail__fill");
  let active = -1;
  const setActive = (i: number) => {
    if (i === active) return;
    active = i;
    chapters.forEach((c, j) => c.classList.toggle("is-active", j === i));
    // a flicker of the torch on each new chapter
    if (!reduced && i >= 0) gsap.fromTo(L, { torch: 1.6 }, { torch: 1, duration: 0.9, ease: "power2.out" });
  };

  const nav = document.querySelector(".nav")!;
  ScrollTrigger.create({ start: 80, end: "max", toggleClass: { targets: nav, className: "nav--scrolled" } });
  ScrollTrigger.create({
    trigger: ".protect",
    start: "top 40px",
    end: "bottom 40px",
    toggleClass: { targets: nav, className: "nav--ink" },
  });

  const mm = gsap.matchMedia();
  mm.add({ desktop: "(min-width: 760px)", phone: "(max-width: 759px)" }, (ctx) => {
    const phone = ctx.conditions!.phone;
    // keyframes per chapter: position + quarter-turns
    const side = phone
      ? { x: () => 0, y: () => vis().h * 0.27, scale: 0.62 }
      : { x: () => vis().w * 0.22, y: () => 0, scale: 1.05 };
    // a full coin-turn between chapters — scrubbed, so it spins while you scroll
    // and lands still while you read
    const TAU = Math.PI * 2;
    const turns = [-0.42, TAU + 0.36, TAU * 2 - 0.3, TAU * 3 + 0.32];

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: ".chapters",
        start: "top bottom",
        end: "bottom bottom",
        scrub: 1.1,
        invalidateOnRefresh: true,
        onUpdate: (st) => {
          // chapter index across the pinned portion (the first 1/5 is the hand-off from the hero)
          const p = (st.progress - 0.2) / 0.8;
          setActive(p < 0 ? -1 : Math.min(3, Math.floor(p * 4)));
          if (fill) fill.style.transform = `scaleY(${gsap.utils.clamp(0, 1, p)})`;
        },
      },
    });

    // timeline units: 1 = hand-off, then 4 chapters of 1 each (matches setActive's 0.2 / 0.8 split)
    // each spin sits on the boundary between chapters
    tl.to(S, { x: side.x, y: side.y, scale: side.scale, rotY: turns[0], duration: 1 }, 0)
      .to(".mark", { opacity: 0.35, duration: 1 }, 0)
      .to(S, { rotY: turns[1], rotX: 0.06, duration: 0.6, ease: "power2.inOut" }, 1.7)
      .to(S, { rotY: turns[2], rotX: -0.05, duration: 0.6, ease: "power2.inOut" }, 2.7)
      .to(S, { rotY: turns[3], rotX: 0.0, duration: 0.6, ease: "power2.inOut" }, 3.7)
      .to({}, { duration: 0.7 }, 4.3);

    // vellum section slides over the stage; the shield lifts away (blended in frame())
    gsap.fromTo(
      K,
      { lift: 0 },
      { lift: 1, ease: "none", scrollTrigger: { trigger: ".protect", start: "top bottom", end: "top top", scrub: 1 } }
    );
    // contact: the shield rises back in, spinning to rest — the bookend
    gsap.fromTo(
      K,
      { cta: 0 },
      { cta: 1, ease: "none", scrollTrigger: { trigger: ".cta", start: "top bottom", end: "top top", scrub: 1 } }
    );
    gsap.to(".mark", {
      opacity: 0,
      ease: "none",
      scrollTrigger: { trigger: ".cta", start: "top bottom", end: "top 30%", scrub: true },
    });
  });
}

/* ───────────────────── "What are you protecting?" ───────────────────── */
const PRACTICES = [
  { name: "Intellectual Property", id: "#ch-ip", line: "Registration, licensing and enforcement for the ideas and marks that make your work valuable." },
  { name: "Media & Entertainment", id: "#ch-media", line: "The agreements that decide who owns the work, who gets paid, and for how long." },
  { name: "Corporate & Commercial", id: "#ch-corporate", line: "Formation, governance, contracts and compliance — structure that holds as you grow." },
  { name: "Property", id: "#ch-property", line: "Acquisitions, title and tenancy — verified before you commit, defended if questioned." },
];

function protect() {
  const chips = document.querySelectorAll<HTMLButtonElement>(".chip");
  const answer = document.querySelector<HTMLElement>(".answer")!;
  chips.forEach((chip) => {
    chip.setAttribute("aria-pressed", "false");
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      const pr = PRACTICES[Number(chip.dataset.to)];
      answer.innerHTML = `
        <div class="answer__card">
          <div>
            <p class="eyebrow eyebrow--ink">For ${chip.dataset.what}</p>
            <h3>${pr.name}</h3>
            <p>${pr.line}</p>
          </div>
          <a class="button" href="${pr.id}"><span class="seal-dot"></span>See how we help</a>
        </div>`;
      const card = answer.querySelector(".answer__card")!;
      gsap.from(card.children, { y: 24, opacity: 0, duration: 0.8, stagger: 0.07, ease: "expo.out" });
      answer.querySelector<HTMLAnchorElement>(".button")!.addEventListener("click", (e) => {
        e.preventDefault();
        // land inside the pinned chapter range at the right index
        const sec = document.querySelector<HTMLElement>(".chapters")!;
        const idx = Number(chip.dataset.to);
        const span = sec.offsetHeight - innerHeight;
        const y = sec.offsetTop - innerHeight + (innerHeight + span) * (0.2 + 0.8 * ((idx + 0.5) / 4)) ;
        lenis.scrollTo(y, { duration: 2 });
      });
    });
  });
}

/* ───────────────────── Boot ───────────────────── */
(async () => {
  lenis.stop();
  scrollTo(0, 0);
  await Promise.all([initScene(), document.fonts.ready]);
  // the story always starts in the dark, even on reload
  lenis.scrollTo(0, { immediate: true, force: true });
  gsap.ticker.add(frame);
  scrollStory();
  protect();
  if (reduced || !shield) skipIntro();
  else intro();
})();
