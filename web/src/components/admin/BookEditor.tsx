"use client";

import { toast } from "@/lib/toast";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Book3D from "@/components/books/Book3D";
import { BRAND_COVERS } from "@/lib/books/cover";
import type { Book, SamplePage } from "@/lib/books/types";
import { bookFileInfo, deleteBook, saveBook, uploadTarget, type BookResult } from "@/app/admin/actions/books";
import PdfPagePicker from "./PdfPagePicker";
import type { FileInfo } from "@/lib/admin/books";

type ImagePage = Extract<SamplePage, { kind: "image" }>;
type Props = { initial: Book; mode: "create" | "update"; file: FileInfo; sold: number };

const PALETTES = [["auto", "Automatic"], ...Object.keys(BRAND_COVERS).map((k) => [k, k[0].toUpperCase() + k.slice(1)])] as [string, string][];
const STATUSES: [Book["status"], string, string][] = [
  ["published", "On sale", "Visible and buyable"],
  ["coming-soon", "Coming soon", "Visible, not buyable yet"],
  ["draft", "Draft", "Hidden from the site"],
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const paras = (s: string) => s.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
const bytes = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const paletteOf = (b: Book) => Object.entries(BRAND_COVERS).find(([, t]) => t.bg === b.cover.theme?.bg && t.ink === b.cover.theme?.ink)?.[0] ?? "auto";

/** Resize to ≤1400px wide and re-encode as WebP in the browser: small, sharp, and it never touches the server. */
async function toWebp(file: File, maxW = 1400): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxW / bmp.width);
  const width = Math.round(bmp.width * scale);
  const height = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), "image/webp", 0.86));
  return { blob, width, height };
}

function put(url: string, body: Blob, type: string, onProgress?: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.setRequestHeader("content-type", type);
    x.setRequestHeader("x-upsert", "true");
    x.setRequestHeader("cache-control", "max-age=31536000");
    x.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    x.onload = () => (x.status < 300 ? resolve() : reject(new Error(`Upload failed (${x.status})`)));
    x.onerror = () => reject(new Error("Upload failed — check your connection"));
    x.send(body);
  });
}

export default function BookEditor({ initial, mode, file: initialFile, sold }: Props) {
  const router = useRouter();
  const [book, setBook] = useState<Book>(initial);
  const [slugTouched, setSlugTouched] = useState(mode === "update");
  const [palette, setPalette] = useState(paletteOf(initial));
  const [synopsis, setSynopsis] = useState(initial.synopsis.join("\n\n"));
  const [contents, setContents] = useState(initial.contents.join("\n"));
  const [forWhom, setForWhom] = useState(initial.forWhom.join("\n"));
  const [file, setFile] = useState<FileInfo>(initialFile);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<BookResult | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, startSaving] = useTransition();
  const sampleInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Book>(k: K, v: Book[K]) => {
    setBook((b) => ({ ...b, [k]: v }));
    setDirty(true);
  };
  const err = (k: string) => result?.errors?.[k];

  // every save/delete/upload answers with a toast; field errors stay inline
  useEffect(() => {
    if (!result) return;
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  }, [result]);

  // leaving with unsaved edits asks first
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", h);
    return () => removeEventListener("beforeunload", h);
  }, [dirty]);

  const draft: Book = useMemo(
    () => ({
      ...book,
      synopsis: paras(synopsis),
      contents: lines(contents),
      forWhom: lines(forWhom),
      cover: { ...book.cover, theme: palette === "auto" ? undefined : BRAND_COVERS[palette] },
    }),
    [book, synopsis, contents, forWhom, palette]
  );

  const pages = book.sample.filter((p): p is ImagePage => p.kind === "image");
  const setPages = (next: SamplePage[]) => set("sample", next);

  async function uploadImages(files: FileList | null, kind: "sample" | "cover") {
    if (!files?.length) return;
    setResult(null);
    const added: ImagePage[] = [];
    try {
      for (const [i, f] of [...files].entries()) {
        setBusy(`${kind === "cover" ? "Uploading cover" : `Uploading page ${i + 1} of ${files.length}`}…`);
        const { blob, width, height } = await toWebp(f, kind === "cover" ? 1200 : 1400);
        const t = await uploadTarget(draft.slug, kind, "image/webp");
        if (!t.ok) throw new Error(t.message);
        await put(t.url, blob, "image/webp");
        added.push({ kind: "image", src: t.publicUrl!, alt: "", width, height });
      }
      if (kind === "cover") set("cover", { ...book.cover, image: added[0].src });
      else setPages([...book.sample, ...added]);
    } catch (e) {
      setResult({ ok: false, message: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function uploadPdf(f: File | undefined) {
    if (!f) return;
    setResult(null);
    if (f.type !== "application/pdf") return setResult({ ok: false, message: "The book must be a PDF." });
    try {
      setBusy("Uploading the book…");
      setProgress(0);
      const t = await uploadTarget(draft.slug, "file", "application/pdf");
      if (!t.ok) throw new Error(t.message);
      await put(t.url, f, "application/pdf", setProgress);
      setFile(await bookFileInfo(draft.slug));
      setResult({ ok: true, message: "Book file uploaded. New buyers get this version." });
    } catch (e) {
      setResult({ ok: false, message: (e as Error).message });
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  const movePage = (i: number, d: -1 | 1) => {
    const next = [...book.sample];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setPages(next);
  };
  const editPage = (i: number, patch: Partial<ImagePage>) =>
    setPages(book.sample.map((p, k) => (k === i && p.kind === "image" ? { ...p, ...patch } : p)));

  function save() {
    setResult(null);
    startSaving(async () => {
      const r = await saveBook(draft, mode);
      setResult(r);
      if (r.ok) {
        setDirty(false);
        if (mode === "create") router.replace(`/admin/books/${r.slug}`);
        else router.refresh();
      }
    });
  }

  function remove() {
    startSaving(async () => {
      const r = await deleteBook(book.slug);
      setResult(r);
      if (r.ok) {
        setDirty(false);
        router.replace("/admin/books");
      }
    });
  }

  return (
    <div className="be">
      <div className="be__main">
        {/* ── basics ── */}
        <section className="a-card">
          <h2>The book</h2>
          <p className="a-card__sub">How it&rsquo;s named on the shelf, its page and the cover.</p>
          <div className="a-form">
            <Field label="Title" error={err("title")} wide>
              <input
                className="a-input"
                value={book.title}
                onChange={(e) => {
                  set("title", e.target.value);
                  if (!slugTouched) set("slug", slugify(e.target.value));
                }}
                maxLength={160}
              />
            </Field>
            <Field label="Subtitle" hint="Optional" wide>
              <input className="a-input" value={book.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} maxLength={220} />
            </Field>
            <Field label="Series" hint="e.g. Part 1">
              <input className="a-input" value={book.series ?? ""} onChange={(e) => set("series", e.target.value)} maxLength={40} />
            </Field>
            <Field label="Author">
              <input className="a-input" value={book.author} onChange={(e) => set("author", e.target.value)} maxLength={120} />
            </Field>
            <Field label="Web address" error={err("slug")} hint={mode === "update" ? "Fixed once created (orders and links use it)" : undefined} wide>
              <div className="a-prefix">
                <span>/books/</span>
                <input
                  className="a-input"
                  value={book.slug}
                  disabled={mode === "update"}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", slugify(e.target.value));
                  }}
                />
              </div>
            </Field>
          </div>
        </section>

        {/* ── selling ── */}
        <section className="a-card">
          <h2>Selling</h2>
          <p className="a-card__sub">Whether it&rsquo;s on sale, and for how much.</p>
          <div className="a-seg" role="radiogroup" aria-label="Status">
            {STATUSES.map(([v, label, hint]) => (
              <label key={v} className={`a-seg__opt a-seg__opt--${v}`}>
                <input type="radio" name="status" checked={book.status === v} onChange={() => set("status", v)} />
                <span>
                  <strong>
                    <i className="a-seg__dot" aria-hidden="true" />
                    {label}
                    <svg className="a-seg__tick" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M3.5 8.4l2.8 2.8 6.2-6.6" />
                    </svg>
                  </strong>
                  <small>{hint}</small>
                </span>
              </label>
            ))}
          </div>
          <div className="a-form">
            <Field label="Price in naira" error={err("price.NGN")}>
              <div className="a-prefix">
                <span>₦</span>
                <input
                  className="a-input"
                  inputMode="numeric"
                  value={book.price.NGN || ""}
                  onChange={(e) => set("price", { ...book.price, NGN: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                />
              </div>
            </Field>
            <Field label="Price in dollars" hint="Optional — leave empty to sell in ₦ only" error={err("price.USD")}>
              <div className="a-prefix">
                <span>$</span>
                <input
                  className="a-input"
                  inputMode="numeric"
                  value={book.price.USD ?? ""}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/\D/g, ""));
                    set("price", n ? { ...book.price, USD: n } : { NGN: book.price.NGN });
                  }}
                />
              </div>
            </Field>
            <Field label="Badge" hint='Optional, e.g. "New edition"' wide>
              <input className="a-input" value={book.notice ?? ""} onChange={(e) => set("notice", e.target.value)} maxLength={120} />
            </Field>
          </div>
        </section>

        {/* ── words ── */}
        <section className="a-card">
          <h2>The page</h2>
          <p className="a-card__sub">What readers see on the book&rsquo;s page — and what Google reads.</p>
          <div className="a-form">
            <Field label="One-line hook" hint="Shown on the shelf card" error={err("hook")} wide>
              <textarea className="a-input a-textarea" rows={2} value={book.hook} onChange={(e) => set("hook", e.target.value)} maxLength={300} />
            </Field>
            <Field label="About the book" hint="Leave an empty line between paragraphs" wide>
              <textarea className="a-input a-textarea" rows={7} value={synopsis} onChange={(e) => (setSynopsis(e.target.value), setDirty(true))} />
            </Field>
            <Field label="Contents" hint="One chapter per line" wide>
              <textarea className="a-input a-textarea" rows={8} value={contents} onChange={(e) => (setContents(e.target.value), setDirty(true))} />
            </Field>
            <Field label="Who it's for" hint="One per line" wide>
              <textarea className="a-input a-textarea" rows={3} value={forWhom} onChange={(e) => (setForWhom(e.target.value), setDirty(true))} />
            </Field>
            <Field label="Format">
              <select className="a-input" value={book.format} onChange={(e) => set("format", e.target.value as Book["format"])}>
                <option>PDF</option>
                <option>EPUB</option>
                <option>PDF + EPUB</option>
              </select>
            </Field>
            <Field label="Pages" error={err("pages")}>
              <input className="a-input" inputMode="numeric" value={book.pages || ""} onChange={(e) => set("pages", Number(e.target.value.replace(/\D/g, "")) || 0)} />
            </Field>
            <Field label="Year">
              <input className="a-input" value={book.year} onChange={(e) => set("year", e.target.value)} maxLength={10} />
            </Field>
          </div>
        </section>

        {/* ── sample ── */}
        <section className="a-card">
          <div className="a-card__head">
            <div>
              <h2>Free sample</h2>
              <p className="a-card__sub">The pages anyone can read before buying. Stop on a cliffhanger.</p>
            </div>
            <div className="a-actions">
              <PdfPagePicker
                slug={draft.slug}
                title={draft.title}
                hasFile={!!file}
                hasSample={book.sample.length > 0}
                onAdd={(added, replace) => setPages(replace ? added : [...book.sample, ...added])}
              />
              <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => sampleInput.current?.click()} disabled={!!busy} title="Upload page images instead">
                Upload images
              </button>
            </div>
            <input ref={sampleInput} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => (uploadImages(e.target.files, "sample"), (e.target.value = ""))} />
          </div>
          {pages.length ? (
            <ol className="a-pages">
              {book.sample.map((p, i) =>
                p.kind === "image" ? (
                  <li key={p.src + i} className="a-page">
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
                    <img src={p.src} alt="" width={p.width ?? 140} height={p.height ?? 200} />
                    <div className="a-page__body">
                      <span className="a-page__n">Page {i + 1}</span>
                      <label className="a-field">
                        <span className="sr-only">Description of page {i + 1}</span>
                        <textarea
                          className="a-input a-textarea"
                          rows={2}
                          placeholder="Describe the page, e.g. “Chapter 1 opener: who owns a song”"
                          value={p.alt}
                          onChange={(e) => editPage(i, { alt: e.target.value })}
                        />
                      </label>
                      {err(`sample.${i}.alt`) && <p className="a-msg a-msg--err">{err(`sample.${i}.alt`)}</p>}
                      <label className="a-check">
                        <input type="checkbox" checked={!!p.teaser} onChange={(e) => editPage(i, { teaser: e.target.checked })} />
                        Cliffhanger page (fades out, then &ldquo;Keep reading&rdquo;)
                      </label>
                    </div>
                    <div className="a-page__tools">
                      <button type="button" className="a-icon" onClick={() => movePage(i, -1)} disabled={i === 0} aria-label={`Move page ${i + 1} up`}>
                        ↑
                      </button>
                      <button type="button" className="a-icon" onClick={() => movePage(i, 1)} disabled={i === book.sample.length - 1} aria-label={`Move page ${i + 1} down`}>
                        ↓
                      </button>
                      <button type="button" className="a-icon a-icon--bad" onClick={() => setPages(book.sample.filter((_, k) => k !== i))} aria-label={`Remove page ${i + 1}`}>
                        ×
                      </button>
                    </div>
                  </li>
                ) : null
              )}
            </ol>
          ) : (
            <p className="a-empty">No sample pages yet. Choose them straight from the book&rsquo;s PDF; it takes a few taps.</p>
          )}
        </section>
      </div>

      {/* ── side: cover + file + save ── */}
      <aside className="be__side">
        <section className="a-card be__cover">
          <h2>Cover</h2>
          <div className="be__preview">
            <Book3D book={draft} width={170} />
          </div>
          {book.cover.image ? (
            <div className="a-actions">
              <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => coverInput.current?.click()} disabled={!!busy}>
                Replace image
              </button>
              <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => set("cover", { ...book.cover, image: undefined })}>
                Use designed cover
              </button>
            </div>
          ) : (
            <>
              <p className="a-small a-mute">Designed in the brand style from the title. Choose its colours:</p>
              <div className="a-swatches" role="radiogroup" aria-label="Cover colours">
                {PALETTES.map(([key, label]) => {
                  const t = key === "auto" ? null : BRAND_COVERS[key];
                  return (
                    <label key={key} className="a-swatch" title={label}>
                      <input type="radio" name="palette" checked={palette === key} onChange={() => (setPalette(key), setDirty(true))} />
                      <span style={t ? { background: t.bg, color: t.foil } : undefined} aria-hidden>
                        {t ? "Aa" : "A"}
                      </span>
                      <small>{label}</small>
                    </label>
                  );
                })}
              </div>
              <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => coverInput.current?.click()} disabled={!!busy}>
                Upload a cover image instead
              </button>
            </>
          )}
          <input ref={coverInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => (uploadImages(e.target.files, "cover"), (e.target.value = ""))} />
        </section>

        <section className="a-card">
          <h2>The book file</h2>
          <p className="a-card__sub">What buyers download. Kept private; only paying buyers get a link.</p>
          {file ? (
            <p className="a-file">
              <span className="a-file__icon" aria-hidden>
                PDF
              </span>
              <span>
                {book.slug}.pdf
                <small>{bytes(file.size)}</small>
              </span>
            </p>
          ) : (
            <p className="a-msg a-msg--err">No file yet — buyers would have nothing to download.</p>
          )}
          {progress !== null && (
            <div className="a-bar a-bar--thin" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${progress * 100}%` }} />
            </div>
          )}
          <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => fileInput.current?.click()} disabled={!!busy}>
            {file ? "Replace PDF" : "Upload PDF"}
          </button>
          <input ref={fileInput} type="file" accept="application/pdf" hidden onChange={(e) => (uploadPdf(e.target.files?.[0]), (e.target.value = ""))} />
        </section>

        <div className="be__save">
          {busy && <p className="a-msg a-mute" role="status">{busy}</p>}
          {result && !result.ok && (
            <p className="a-msg a-msg--err" role="status">
              {result.message}
            </p>
          )}
          <button type="button" className="a-btn" onClick={save} disabled={saving || !!busy}>
            {saving ? "Saving…" : mode === "create" ? "Create book" : dirty ? "Save changes" : "Saved"}
          </button>
          {mode === "update" && book.status !== "draft" && (
            <a className="a-btn a-btn--ghost" href={`/books/${book.slug}`} target="_blank" rel="noreferrer">
              View on the site ↗
            </a>
          )}
          {mode === "update" &&
            (sold > 0 ? (
              <p className="a-small a-mute">
                This book has {sold} {sold === 1 ? "sale" : "sales"}, so it can&rsquo;t be deleted: buyers&rsquo; receipts point to it. Set it to Draft to hide it from the site.
              </p>
            ) : confirmDelete ? (
              <div className="be__confirm" role="alert">
                <p>
                  Delete <strong>{initial.title || "this book"}</strong> for good? Its page, cover, sample pages and PDF are removed. This can&rsquo;t be undone.
                </p>
                <div className="a-actions">
                  <button type="button" className="a-btn a-btn--confirm a-btn--sm" onClick={remove} disabled={saving}>
                    {saving ? "Deleting…" : "Delete for good"}
                  </button>
                  <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="a-btn a-btn--danger a-btn--sm" onClick={() => setConfirmDelete(true)}>
                Delete book
              </button>
            ))}
        </div>
      </aside>
    </div>
  );
}

function Field({ label, hint, error, wide, children }: { label: string; hint?: string; error?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`a-field${wide ? " a-field--wide" : ""}`}>
      <span className="a-field__label">
        {label}
        {hint && <small>{hint}</small>}
      </span>
      {children}
      {error && <span className="a-msg a-msg--err">{error}</span>}
    </label>
  );
}
