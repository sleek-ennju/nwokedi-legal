import * as THREE from "three";
import shapesData from "./shield-shapes.json";

/**
 * Builds the Nwokedi Legal shield as real 3D geometry from the official
 * emblem SVG (NLvariation-12), via outlines pre-computed at build time by
 * scripts/build-shield-shapes.mjs (no SVG parsing at runtime). Path order:
 *   0 gold torch handle · 1–3 red flame ribbons · 4 "N" · 5 "L" · 6 shield frame (with inner hole)
 */

const W = 287.24;
const H = 374.11;
const U = 1 / 100; // svg units → world units (outlines are pre-converted; used for the handle anchor)

export type Shield = {
  group: THREE.Group;
  lines: THREE.Line[];
  materials: THREE.Material[];
  uniforms: { uTime: { value: number }; uIgnite: { value: number } };
  gold: THREE.MeshPhysicalMaterial;
  red: THREE.MeshPhysicalMaterial;
  lineMat: THREE.LineBasicMaterial;
  handleAnchor: THREE.Object3D;
  setDraw: (p: number) => void;
};

type ShapeJSON = { outer: number[]; holes: number[][] };
const toVecs = (flat: number[]) => {
  const v: THREE.Vector2[] = [];
  for (let i = 0; i < flat.length; i += 2) v.push(new THREE.Vector2(flat[i], flat[i + 1]));
  return v;
};
const toShape = (d: ShapeJSON) => {
  const s = new THREE.Shape(toVecs(d.outer));
  d.holes.forEach((h) => s.holes.push(new THREE.Path(toVecs(h))));
  return s;
};

export function buildShield(clip: THREE.Plane[], lite = false): Shield {
  const paths = (shapesData as { shapes: ShapeJSON[] }[]).map((p) => p.shapes);

  const uniforms = { uTime: { value: 0 }, uIgnite: { value: 0 } };

  const frameMat = new THREE.MeshPhysicalMaterial({
    color: "#a27a50",
    metalness: 1,
    roughness: 0.3,
    clearcoat: 0.5,
    clearcoatRoughness: 0.25,
  });
  const plateMat = new THREE.MeshPhysicalMaterial({
    color: "#0f1b30",
    metalness: 0.0,
    roughness: 0.62,
    clearcoat: 0.35,
    clearcoatRoughness: 0.5,
    envMapIntensity: 0.35,
  });
  const creamMat = new THREE.MeshPhysicalMaterial({
    color: "#E9E1CE",
    metalness: 0.0,
    roughness: 0.38,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
  });
  const red = new THREE.MeshPhysicalMaterial({
    color: "#C61C23",
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    emissive: new THREE.Color("#C61C23"),
    emissiveIntensity: 0.0,
    side: THREE.DoubleSide,
  });
  const gold = new THREE.MeshPhysicalMaterial({
    color: "#EDAF24",
    metalness: 1,
    roughness: 0.22,
    emissive: new THREE.Color("#EDAF24"),
    emissiveIntensity: 0,
  });

  // Flame ribbons: flutter toward the tips (left), and burn in from the torch (right).
  red.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.uniforms.uIgnite = uniforms.uIgnite;
    sh.vertexShader =
      "uniform float uTime;\nvarying float vX;\n" +
      sh.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vX = position.x;
        float tip = clamp((1.25 - position.x) / 2.7, 0.0, 1.0);
        transformed.y += sin(position.x * 3.1 - uTime * 2.2) * 0.04 * tip * tip;
        transformed.z += sin(position.x * 2.3 - uTime * 1.6 + position.y * 2.0) * 0.05 * tip;`
      );
    sh.fragmentShader =
      "uniform float uIgnite;\nvarying float vX;\n" +
      sh.fragmentShader
        .replace(
          "#include <clipping_planes_fragment>",
          `#include <clipping_planes_fragment>
          float burnEdge = mix(1.55, -1.75, uIgnite);
          if (vX < burnEdge) discard;`
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          float ember = 1.0 - smoothstep(0.0, 0.22, vX - burnEdge);
          float live = step(0.001, uIgnite) * (1.0 - smoothstep(0.96, 1.0, uIgnite));
          totalEmissiveRadiance += vec3(1.0, 0.6, 0.16) * ember * 3.0 * live;`
        );
  };

  const all = [frameMat, plateMat, creamMat, red, gold];
  all.forEach((m) => {
    m.clippingPlanes = clip;
    if (lite) m.clearcoat = 0; // the clearcoat pass is the most expensive part on weak GPUs
  });

  const group = new THREE.Group();
  const lines: THREE.Line[] = [];
  const lineMat = new THREE.LineBasicMaterial({ color: "#d9b98f", transparent: true, opacity: 0.95 });

  // depth plan (world units): plate z 0→0.04, frame 0→0.16, motifs 0.04→0.11
  const spec = [
    { mat: gold, depth: 0.07, z: 0.04, bevel: 0.006 }, // handle
    { mat: red, depth: 0.05, z: 0.05, bevel: 0.0 }, // flame
    { mat: red, depth: 0.05, z: 0.05, bevel: 0.0 }, // flame
    { mat: red, depth: 0.05, z: 0.05, bevel: 0.0 }, // flame
    { mat: creamMat, depth: 0.06, z: 0.04, bevel: 0.005 }, // N
    { mat: creamMat, depth: 0.06, z: 0.04, bevel: 0.005 }, // L
    { mat: frameMat, depth: 0.16, z: 0.0, bevel: 0.016 }, // frame
  ];

  paths.forEach((pathShapes, i) => {
    const s = spec[i];
    if (!s) return;
    const shapes = pathShapes.map(toShape);
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: s.depth,
      bevelEnabled: s.bevel > 0,
      bevelThickness: s.bevel,
      bevelSize: s.bevel * 0.7,
      bevelSegments: 4,
      curveSegments: 1,
    });
    if (s.mat === red) {
      // more vertices along x so the flutter bends smoothly
      geo.computeVertexNormals();
    }
    const mesh = new THREE.Mesh(geo, s.mat);
    mesh.position.z = s.z;
    group.add(mesh);

    // hairline outlines for the "drafting" intro
    const front = s.z + s.depth + s.bevel;
    shapes.forEach((sh) => {
      [sh.getPoints(), ...sh.holes.map((h) => h.getPoints())].forEach((pts) => {
        const v = pts.map((p) => new THREE.Vector3(p.x, p.y, front + 0.002));
        v.push(v[0].clone());
        const g = new THREE.BufferGeometry().setFromPoints(v);
        g.setDrawRange(0, 0);
        const line = new THREE.Line(g, lineMat);
        line.userData.count = v.length;
        group.add(line);
        lines.push(line);
      });
    });

    // enamel back plate filling the frame's inner hole
    if (i === 6) {
      const inner = shapes[0].holes[0];
      if (inner) {
        const plate = new THREE.Shape(inner.getPoints());
        const pg = new THREE.ExtrudeGeometry(plate, { depth: 0.04, bevelEnabled: false });
        const pm = new THREE.Mesh(pg, plateMat);
        pm.position.z = 0.0;
        group.add(pm);
      }
    }
  });

  // anchor at the torch handle, used to place the glow and torch light
  const handleAnchor = new THREE.Object3D();
  handleAnchor.position.set((236 - W / 2) * U, -(270 - H / 2) * U, 0.25);
  group.add(handleAnchor);

  const setDraw = (p: number) => {
    lines.forEach((l, i) => {
      // slight stagger: frame first (added last), motifs after
      const order = 1 - i / Math.max(1, lines.length - 1);
      const local = THREE.MathUtils.clamp(p * 1.35 - order * 0.35, 0, 1);
      l.geometry.setDrawRange(0, Math.floor(local * (l.userData.count as number)));
    });
  };

  return { group, lines, materials: all, uniforms, gold, red, lineMat, handleAnchor, setDraw };
}
