import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildShield } from "./shield";

/**
 * The 3D scene, written once and run either inside a Web Worker on an
 * OffscreenCanvas (preferred — zero main-thread cost) or on the main thread
 * as a fallback. It is a "dumb" renderer: every frame it receives a small
 * Float32Array of already-computed values and draws them.
 */

export { F } from "./protocol";
export type { SceneApi, SceneOpts } from "./protocol";
import { F, type SceneApi, type SceneOpts } from "./protocol";

const breathe = () => new Promise<void>((r) => setTimeout(r, 0));

export async function createScene(canvas: HTMLCanvasElement | OffscreenCanvas, o: SceneOpts): Promise<SceneApi> {
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas as HTMLCanvasElement,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(o.dpr);
  renderer.setSize(o.width, o.height, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.localClippingEnabled = true;
  await breathe();

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  pmrem.dispose();
  await breathe();

  const camera = new THREE.PerspectiveCamera(o.fov, o.width / o.height, 0.1, 100);
  const key = new THREE.DirectionalLight("#ffe2bd", 1.6);
  key.position.set(-3, 4, 6);
  const rim = new THREE.DirectionalLight("#7d95c9", 1.1);
  rim.position.set(4, -2, -4);
  const lampLight = new THREE.PointLight("#fff0d6", 0, 10, 1.3);
  const torchLight = new THREE.PointLight("#ffb547", 0, 5, 1.4);
  scene.add(key, rim, lampLight);

  const clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -3);
  const shield = buildShield([clipPlane], o.lite);
  const pivot = new THREE.Group();
  pivot.add(shield.group);
  scene.add(pivot);
  shield.handleAnchor.add(torchLight);
  await breathe();

  await renderer.compileAsync(scene, camera);

  const tmp = new THREE.Vector3();
  let lastDraw = -1;

  return {
    render(st) {
      camera.position.z = st[F.camZ];
      pivot.position.set(st[F.px], st[F.py], st[F.pz]);
      pivot.scale.setScalar(st[F.scale]);
      pivot.rotation.set(st[F.rx], st[F.ry], 0);

      lampLight.position.set(st[F.lampX] * 3.4, st[F.lampY] * 2.2, 4.2);
      lampLight.intensity = st[F.lamp] * 1.8;
      const t = st[F.time];
      torchLight.intensity = st[F.torch] * (1.4 + Math.sin(t * 9) * 0.12 + Math.sin(t * 23) * 0.08);
      shield.gold.emissiveIntensity = st[F.torch] * 0.45;
      shield.red.emissiveIntensity = st[F.torch] * 0.06;
      shield.uniforms.uTime.value = t;
      shield.uniforms.uIgnite.value = st[F.ignite];
      shield.lineMat.opacity = st[F.lineOpacity];
      shield.lineMat.visible = st[F.lineOpacity] > 0.001;
      if (st[F.draw] !== lastDraw) {
        lastDraw = st[F.draw];
        shield.setDraw(lastDraw);
      }
      clipPlane.constant = -st[F.reveal];

      renderer.render(scene, camera);
      shield.handleAnchor.getWorldPosition(tmp).project(camera);
      return [tmp.x, tmp.y];
    },
    resize(w, h) {
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    },
  };
}
