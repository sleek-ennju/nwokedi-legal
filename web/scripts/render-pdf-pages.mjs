// Renders selected PDF pages to images with pdf.js in headless Chrome.
// Used to produce a book's SAMPLE pages (never the whole book) and its cover.
//
//   node scripts/render-pdf-pages.mjs <book.pdf> <outDir> <pages e.g. 1,4-7> [scale=2]
//
// Writes <outDir>/p-<n>.png for each page. Convert/compress afterwards.
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import puppeteer from "puppeteer-core";

const [, , pdfPath, outDir, pageSpec, scaleArg] = process.argv;
if (!pdfPath || !outDir || !pageSpec) {
  console.error("usage: node scripts/render-pdf-pages.mjs <book.pdf> <outDir> <pages> [scale]");
  process.exit(1);
}
const pages = pageSpec.split(",").flatMap((part) => {
  const [a, b] = part.split("-").map(Number);
  return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a];
});
const scale = Number(scaleArg ?? 2);
const pdfjs = resolve("node_modules/pdfjs-dist/build");
const files = {
  "/pdf.mjs": [join(pdfjs, "pdf.min.mjs"), "text/javascript"],
  "/pdf.worker.mjs": [join(pdfjs, "pdf.worker.min.mjs"), "text/javascript"],
  "/book.pdf": [resolve(pdfPath), "application/pdf"],
  "/": [null, "text/html"],
};
const html = `<!doctype html><script type="module">
import * as pdfjs from "/pdf.mjs";
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";
window.render = async (n, scale) => {
  const doc = window.doc ??= await pdfjs.getDocument("/book.pdf").promise;
  const page = await doc.getPage(n);
  const vp = page.getViewport({ scale });
  const c = document.createElement("canvas");
  c.width = vp.width; c.height = vp.height;
  await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
  return c.toDataURL("image/png");
};
window.ready = true;
</script>`;

const server = createServer((req, res) => {
  const f = files[req.url];
  if (!f) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": f[1] });
  res.end(f[0] ? readFileSync(f[0]) : html);
}).listen(0);
const port = server.address().port;

const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction("window.ready === true");
  mkdirSync(outDir, { recursive: true });
  for (const n of pages) {
    const dataUrl = await page.evaluate((n, s) => window.render(n, s), n, scale);
    writeFileSync(join(outDir, `p-${String(n).padStart(2, "0")}.png`), Buffer.from(dataUrl.split(",")[1], "base64"));
    console.log("rendered page", n);
  }
} finally {
  await browser.close();
  server.close();
}
