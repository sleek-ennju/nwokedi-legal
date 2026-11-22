"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { SamplePage } from "@/lib/books/types";
import { bookFileReadUrl, uploadTarget } from "@/app/admin/actions/books";
import { toast } from "@/lib/toast";
import { putSigned } from "./upload-client";

type ImagePage = Extract<SamplePage, { kind: "image" }>;
type Props = {
  slug: string;
  title: string;
  /** is the full book already uploaded? (otherwise she picks a PDF from her computer) */
  hasFile: boolean;
  hasSample: boolean;
  onAdd: (pages: ImagePage[], replace: boolean) => void;
};

const SAMPLE_WIDTH = 1400; // px of each rendered sample page
const CLIFF = 0.55; // the cliffhanger page keeps its top 55%, then fades out on the site

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  // self-hosted worker (public/pdfjs), so nothing loads from a third-party CDN
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
  return pdfjs;
}

/**
 * Pick sample pages straight from the book's PDF: thumbnails of every page (rendered
 * lazily as they scroll into view), tap to select, optionally cut the last one into a
 * cliffhanger, and each page is rendered sharp, turned into WebP and uploaded. Page
 * descriptions are filled from the page's own text so she rarely needs to type any.
 */
export default function PdfPagePicker({ slug, title, hasFile, hasSample, onAdd }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const [cliff, setCliff] = useState(true);
  const [replace, setReplace] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  // blank pages (e.g. the back of a title page) are flagged and skipped by "First 5"
  const [blank, setBlank] = useState<Set<number>>(new Set());
  const onBlank = useCallback((n: number) => setBlank((b) => new Set(b).add(n)), []);

  /** The first five pages with something on them (checks blanks it hasn't drawn yet). */
  const firstFive = async () => {
    if (!doc) return;
    const out: number[] = [];
    for (let n = 1; n <= doc.numPages && out.length < 5; n++) {
      if (blank.has(n)) continue;
      if (await isBlankPage(doc, n)) {
        onBlank(n);
        continue;
      }
      out.push(n);
    }
    setPicked(out);
  };

  const open = async () => {
    if (!/^[a-z0-9-]+$/.test(slug)) return toast.error("Give the book a title first", { description: "Its web address is used to store the pages." });
    dialog.current?.showModal();
    if (!doc && hasFile) await loadFromStorage();
  };

  const loadFromStorage = async () => {
    setLoading(true);
    try {
      const url = await bookFileReadUrl(slug);
      if (!url) throw new Error("no url");
      const pdfjs = await loadPdfjs();
      setDoc(await pdfjs.getDocument({ url, standardFontDataUrl: "/pdfjs/standard_fonts/" }).promise);
    } catch {
      toast.error("Couldn't open the book file", { description: "Try choosing the PDF from your computer instead." });
    } finally {
      setLoading(false);
    }
  };

  const loadFromFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.type !== "application/pdf") return toast.error("That isn't a PDF");
    setLoading(true);
    try {
      const pdfjs = await loadPdfjs();
      const data = new Uint8Array(await f.arrayBuffer());
      setDoc(await pdfjs.getDocument({ data, standardFontDataUrl: "/pdfjs/standard_fonts/" }).promise);
      setPicked([]);
    } catch {
      toast.error("Couldn't read that PDF");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (n: number) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n].sort((a, b) => a - b)));
  const close = () => dialog.current?.close();

  async function addPages() {
    if (!doc || !picked.length) return;
    const pages: ImagePage[] = [];
    try {
      for (const [i, n] of picked.entries()) {
        setBusy(`Preparing page ${i + 1} of ${picked.length}…`);
        const page = await doc.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: SAMPLE_WIDTH / base.width });
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#fff"; // PDFs assume white paper
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;

        // the cliffhanger: keep the top of the last page only
        const isCliff = cliff && i === picked.length - 1 && picked.length > 1;
        let out = canvas;
        if (isCliff) {
          out = document.createElement("canvas");
          out.width = canvas.width;
          out.height = Math.round(canvas.height * CLIFF);
          out.getContext("2d")!.drawImage(canvas, 0, 0);
        }
        const blob = await new Promise<Blob>((res, rej) => out.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/webp", 0.86));

        // describe the page from its own words (editable afterwards)
        const text = (await page.getTextContent()).items
          .map((it) => ("str" in it ? it.str : ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        const alt = text ? `Page ${n}: ${text.slice(0, 140)}${text.length > 140 ? "…" : ""}` : `Page ${n} of ${title || "the book"}`;

        const t = await uploadTarget(slug, "sample", "image/webp");
        if (!t.ok) throw new Error(t.message);
        await putSigned(t.url, blob, "image/webp");
        pages.push({ kind: "image", src: t.publicUrl!, alt, width: out.width, height: out.height, ...(isCliff ? { teaser: true } : {}) });
      }
      onAdd(pages, replace && hasSample);
      toast.success(`${pages.length} sample ${pages.length === 1 ? "page" : "pages"} added`, { description: "Save the book to put them on the site." });
      setPicked([]);
      close();
    } catch (e) {
      toast.error("Couldn't add the pages", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <button type="button" className="a-btn a-btn--sm" onClick={open}>
        Choose pages from the book
      </button>

      <dialog ref={dialog} className="pp" aria-labelledby="pp-title" onCancel={(e) => busy && e.preventDefault()}>
        <header className="pp__head">
          <div>
            <h2 id="pp-title">Choose the free sample</h2>
            <p>Tap the pages readers can see before buying. Most books stop just as the first chapter gets going.</p>
          </div>
          <button type="button" className="a-icon" onClick={close} aria-label="Close" disabled={!!busy}>
            ×
          </button>
        </header>

        {!doc ? (
          <div className="pp__empty">
            {loading ? (
              <p>Opening the book…</p>
            ) : (
              <>
                <p>{hasFile ? "Couldn't open the uploaded book." : "Upload the book's PDF first, or open it from your computer just to pick pages."}</p>
                <div className="a-actions">
                  {hasFile && (
                    <button type="button" className="a-btn a-btn--ghost" onClick={loadFromStorage}>
                      Try again
                    </button>
                  )}
                  <button type="button" className="a-btn" onClick={() => fileInput.current?.click()}>
                    Choose a PDF from this computer
                  </button>
                </div>
              </>
            )}
            <input ref={fileInput} type="file" accept="application/pdf" hidden onChange={(e) => (loadFromFile(e.target.files?.[0]), (e.target.value = ""))} />
          </div>
        ) : (
          <>
            <div className="pp__bar">
              <span>
                <b>{picked.length}</b> of {doc.numPages} pages selected
              </span>
              <div className="a-actions">
                <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={firstFive}>
                  First 5 pages
                </button>
                {picked.length > 0 && (
                  <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => setPicked([])}>
                    Clear
                  </button>
                )}
              </div>
            </div>
            <ol className="pp__grid">
              {Array.from({ length: doc.numPages }, (_, i) => i + 1).map((n) => (
                <li key={n}>
                  <Thumb
                    doc={doc}
                    n={n}
                    order={picked.indexOf(n)}
                    cliff={cliff && picked.length > 1 && picked[picked.length - 1] === n}
                    blank={blank.has(n)}
                    onBlank={onBlank}
                    onToggle={toggle}
                  />
                </li>
              ))}
            </ol>
            <footer className="pp__foot">
              <div className="pp__opts">
                <label className="a-check">
                  <input type="checkbox" checked={cliff} onChange={(e) => setCliff(e.target.checked)} />
                  Cut the last page halfway (a cliffhanger)
                </label>
                {hasSample && (
                  <label className="a-check">
                    <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
                    Replace the current sample pages
                  </label>
                )}
              </div>
              <button type="button" className="a-btn" disabled={!picked.length || !!busy} onClick={addPages}>
                {busy ?? (picked.length ? `Add ${picked.length} ${picked.length === 1 ? "page" : "pages"}` : "Select pages")}
              </button>
            </footer>
          </>
        )}
      </dialog>
    </>
  );
}

/** Nearly every pixel white = a blank page. Cheap: a tiny render with no text on it. */
async function isBlankPage(doc: PDFDocumentProxy, n: number) {
  const page = await doc.getPage(n);
  if ((await page.getTextContent()).items.some((it) => "str" in it && it.str.trim())) return false;
  const base = page.getViewport({ scale: 1 });
  const vp = page.getViewport({ scale: 60 / base.width });
  const c = document.createElement("canvas");
  c.width = Math.ceil(vp.width);
  c.height = Math.ceil(vp.height);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  return looksBlank(ctx, c.width, c.height);
}

function looksBlank(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const px = ctx.getImageData(0, 0, w, h).data;
  let ink = 0;
  for (let i = 0; i < px.length; i += 4) if (px[i] < 235 || px[i + 1] < 235 || px[i + 2] < 235) ink++;
  return ink / (w * h) < 0.003;
}

/** One page thumbnail, rendered only once it scrolls into view (fast for long books). */
function Thumb({
  doc,
  n,
  order,
  cliff,
  blank,
  onBlank,
  onToggle,
}: {
  doc: PDFDocumentProxy;
  n: number;
  order: number;
  cliff: boolean;
  blank: boolean;
  onBlank: (n: number) => void;
  onToggle: (n: number) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  const render = useCallback(async () => {
    const c = canvas.current;
    if (!c || ready) return;
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: (180 * Math.min(2, window.devicePixelRatio || 1)) / base.width });
    c.width = Math.round(vp.width);
    c.height = Math.round(vp.height);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    setReady(true);
    if (looksBlank(ctx, c.width, c.height)) onBlank(n);
  }, [doc, n, ready, onBlank]);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const io = new IntersectionObserver((es) => es[0].isIntersecting && (render(), io.disconnect()), { rootMargin: "300px" });
    io.observe(c);
    return () => io.disconnect();
  }, [render]);

  const on = order >= 0;
  return (
    <button type="button" className={`pp__page${on ? " is-on" : ""}${cliff ? " is-cliff" : ""}${ready ? " is-ready" : ""}`} aria-pressed={on} aria-label={`Page ${n}${on ? `, sample page ${order + 1}` : ""}`} onClick={() => onToggle(n)}>
      <span className="pp__paper">
        <canvas ref={canvas} />
        {cliff && <span className="pp__cut" aria-hidden="true" />}
        {on && <span className="pp__badge">{order + 1}</span>}
      </span>
      <span className="pp__n">{cliff ? `Page ${n} · cliffhanger` : blank ? `Page ${n} · blank` : `Page ${n}`}</span>
    </button>
  );
}
