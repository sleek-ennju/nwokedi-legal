// Pre-computes the shield emblem's outlines (from the official SVG) into world-unit
// point arrays, so the browser never parses SVG or touches DOMParser at runtime.
// Run: node scripts/build-shield-shapes.mjs   (re-run only if the emblem SVG changes)
import { readFileSync, writeFileSync } from "node:fs";
import { DOMParser } from "@xmldom/xmldom";
globalThis.DOMParser = DOMParser;
const { SVGLoader } = await import("three/examples/jsm/loaders/SVGLoader.js");

const W = 287.24, H = 374.11, U = 1 / 100, SEG = 40;
const r = (n) => Math.round(n * 10000) / 10000;
const svg = readFileSync(new URL("../public/brand/emblem.svg", import.meta.url), "utf8");
const { paths } = new SVGLoader().parse(svg);

const out = paths.map((p) => ({
  fill: p.userData.style.fill,
  shapes: SVGLoader.createShapes(p).map((sh) => {
    const { shape, holes } = sh.extractPoints(SEG);
    const flat = (pts) => pts.flatMap((v) => [r((v.x - W / 2) * U), r(-(v.y - H / 2) * U)]);
    return { outer: flat(shape), holes: holes.map(flat) };
  }),
}));
writeFileSync(new URL("../src/experience/shield-shapes.json", import.meta.url), JSON.stringify(out));
console.log(out.map((p) => `${p.fill}: ${p.shapes.length} shape(s), ${p.shapes.reduce((n, s) => n + s.outer.length / 2, 0)} pts`).join("\n"));
