"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Markdown } from "@/lib/articles/markdown";
import { articleImageTarget, deleteArticle, saveArticle, type ArticleResult } from "@/app/admin/actions/articles";
import { putSigned, toWebp } from "./upload-client";

export type EditableArticle = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  practice: string;
  cover_url: string | null;
  cover_alt: string | null;
  featured: boolean;
  publish_at: string | null;
  state: "draft" | "scheduled" | "published";
};

type Props = { initial: EditableArticle; mode: "create" | "update"; practices: { id: string; name: string }[] };

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

/** ISO ⇄ "YYYY-MM-DDTHH:mm" in Lagos time (UTC+1, no daylight saving). */
const toLagosInput = (iso: string | null) => (iso ? new Date(Date.parse(iso) + 3600_000).toISOString().slice(0, 16) : "");
const fromLagosInput = (v: string) => (v ? new Date(Date.parse(`${v}:00Z`) - 3600_000).toISOString() : null);

const STATE_LABEL = { draft: "Draft", scheduled: "Scheduled", published: "Published" } as const;

export default function ArticleEditor({ initial, mode, practices }: Props) {
  const router = useRouter();
  const [a, setA] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(mode === "update");
  const [schedule, setSchedule] = useState(toLagosInput(initial.state === "scheduled" ? initial.publish_at : null));
  const [view, setView] = useState<"write" | "preview">("write");
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<ArticleResult | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, startSaving] = useTransition();
  const body = useRef<HTMLTextAreaElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const inlineInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof EditableArticle>(k: K, v: EditableArticle[K]) => {
    setA((x) => ({ ...x, [k]: v }));
    setDirty(true);
  };
  const err = (k: string) => result?.errors?.[k];
  const words = a.body.split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", h);
    return () => removeEventListener("beforeunload", h);
  }, [dirty]);

  /** Wrap the selection (or insert at the caret), keeping the caret where a writer expects it. */
  function format(kind: "h2" | "h3" | "bold" | "italic" | "quote" | "ul" | "ol" | "link" | "hr") {
    const ta = body.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e);
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    let next = value;
    let caret = e;
    const prefixLines = (p: (i: number) => string) => {
      const block = value.slice(lineStart, e) || "";
      const lines = (block || "").split("\n").map((l, i) => p(i) + l.replace(/^(#{2,3}\s|>\s|[-*]\s|\d+\.\s)/, ""));
      next = value.slice(0, lineStart) + lines.join("\n") + value.slice(e);
      caret = lineStart + lines.join("\n").length;
    };
    if (kind === "bold" || kind === "italic") {
      const m = kind === "bold" ? "**" : "*";
      const text = sel || (kind === "bold" ? "important point" : "emphasis");
      next = value.slice(0, s) + m + text + m + value.slice(e);
      caret = s + m.length + text.length + m.length;
    } else if (kind === "link") {
      const text = sel || "link text";
      next = value.slice(0, s) + `[${text}](https://)` + value.slice(e);
      caret = s + text.length + 3 + 8;
    } else if (kind === "hr") {
      next = value.slice(0, s) + "\n\n---\n\n" + value.slice(e);
      caret = s + 7;
    } else if (kind === "h2") prefixLines(() => "## ");
    else if (kind === "h3") prefixLines(() => "### ");
    else if (kind === "quote") prefixLines(() => "> ");
    else if (kind === "ul") prefixLines(() => "- ");
    else if (kind === "ol") prefixLines((i) => `${i + 1}. `);
    set("body", next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(caret, caret);
    });
  }

  async function upload(file: File | undefined, where: "cover" | "inline") {
    if (!file) return;
    setResult(null);
    try {
      setBusy(where === "cover" ? "Uploading the cover…" : "Adding the image…");
      const { blob } = await toWebp(file, where === "cover" ? 2000 : 1600);
      const t = await articleImageTarget(a.slug, "image/webp");
      if (!t.ok) throw new Error(t.message);
      await putSigned(t.url, blob, "image/webp");
      if (where === "cover") set("cover_url", t.publicUrl);
      else {
        const ta = body.current!;
        const at = ta.selectionStart;
        set("body", a.body.slice(0, at) + `\n\n![Describe the image](${t.publicUrl})\n\n` + a.body.slice(at));
      }
    } catch (e) {
      setResult({ ok: false, message: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  function save(intent: "draft" | "publish" | "schedule") {
    setResult(null);
    startSaving(async () => {
      const r = await saveArticle(
        {
          slug: a.slug,
          title: a.title,
          excerpt: a.excerpt,
          body: a.body,
          practice: a.practice,
          cover_url: a.cover_url,
          cover_alt: a.cover_alt,
          featured: a.featured,
          intent,
          publishAt: intent === "schedule" ? fromLagosInput(schedule) : null,
        },
        mode
      );
      setResult(r);
      if (r.ok) {
        setDirty(false);
        if (mode === "create") router.replace(`/admin/articles/${r.slug}`);
        else router.refresh();
      }
    });
  }

  const tools: [Parameters<typeof format>[0], string, string][] = [
    ["h2", "H2", "Section heading"],
    ["h3", "H3", "Subheading"],
    ["bold", "B", "Bold"],
    ["italic", "I", "Italic"],
    ["quote", "“ ”", "Quote"],
    ["ul", "•", "Bulleted list"],
    ["ol", "1.", "Numbered list"],
    ["link", "Link", "Link"],
    ["hr", "—", "Divider"],
  ];

  return (
    <div className="be ae">
      <div className="be__main">
        <section className="a-card ae__write">
          <label className="sr-only" htmlFor="ae-title">
            Title
          </label>
          <textarea
            id="ae-title"
            className="ae__title"
            rows={1}
            placeholder="Title"
            value={a.title}
            maxLength={180}
            onChange={(e) => {
              set("title", e.target.value.replace(/\n/g, " "));
              if (!slugTouched) set("slug", slugify(e.target.value));
            }}
          />
          {err("title") && <p className="a-msg a-msg--err">{err("title")}</p>}
          <label className="sr-only" htmlFor="ae-excerpt">
            Summary
          </label>
          <textarea
            id="ae-excerpt"
            className="ae__excerpt"
            rows={2}
            placeholder="A one or two-sentence summary — what readers (and Google) see first."
            value={a.excerpt}
            maxLength={320}
            onChange={(e) => set("excerpt", e.target.value.replace(/\n/g, " "))}
          />
          {err("excerpt") && <p className="a-msg a-msg--err">{err("excerpt")}</p>}

          <div className="ae__bar">
            <div className="ae__tools" role="toolbar" aria-label="Formatting">
              {tools.map(([k, label, title]) => (
                <button key={k} type="button" className={`ae__tool ae__tool--${k}`} onClick={() => format(k)} title={title} aria-label={title} disabled={view === "preview"}>
                  {label}
                </button>
              ))}
              <button type="button" className="ae__tool" onClick={() => inlineInput.current?.click()} disabled={!!busy || view === "preview"} title="Insert an image" aria-label="Insert an image">
                Image
              </button>
              <input ref={inlineInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => (upload(e.target.files?.[0], "inline"), (e.target.value = ""))} />
            </div>
            <div className="a-tabs" role="tablist" aria-label="Editor view">
              <a href="#write" role="tab" aria-selected={view === "write"} aria-current={view === "write" ? "page" : undefined} onClick={(e) => (e.preventDefault(), setView("write"))}>
                Write
              </a>
              <a href="#preview" role="tab" aria-selected={view === "preview"} aria-current={view === "preview" ? "page" : undefined} onClick={(e) => (e.preventDefault(), setView("preview"))}>
                Preview
              </a>
            </div>
          </div>

          {view === "write" ? (
            <textarea
              ref={body}
              className="ae__body"
              aria-label="Article"
              placeholder={"Start writing…\n\nUse ## for a section heading, **bold**, *italic*, > for a quote and - for a list. The buttons above do it for you."}
              value={a.body}
              onChange={(e) => set("body", e.target.value)}
            />
          ) : (
            <div className="ae__preview">{a.body.trim() ? <Markdown source={a.body} className="prose" /> : <p className="a-empty">Nothing to preview yet.</p>}</div>
          )}
          <p className="ae__count">
            {words.toLocaleString()} words · about {Math.max(1, Math.round(words / 220))} min read
          </p>
          {err("body") && <p className="a-msg a-msg--err">{err("body")}</p>}
        </section>
      </div>

      <aside className="be__side">
        <section className="a-card">
          <div className="ae__status">
            <h2>Publishing</h2>
            <span className={`a-pill a-pill--${a.state === "published" ? "published" : a.state === "scheduled" ? "coming-soon" : "draft"}`}>{STATE_LABEL[a.state]}</span>
          </div>
          <label className="a-field a-field--wide">
            <span className="a-field__label">
              Schedule for
              <small>Lagos time — leave empty to publish now</small>
            </span>
            <input className="a-input" type="datetime-local" value={schedule} onChange={(e) => (setSchedule(e.target.value), setDirty(true))} />
            {err("publishAt") && <span className="a-msg a-msg--err">{err("publishAt")}</span>}
          </label>
        </section>

        <section className="a-card">
          <h2>Details</h2>
          <label className="a-field a-field--wide">
            <span className="a-field__label">Practice area</span>
            <select className="a-input" value={a.practice} onChange={(e) => set("practice", e.target.value)}>
              {practices.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="a-check">
            <input type="checkbox" checked={a.featured} onChange={(e) => set("featured", e.target.checked)} />
            Feature at the top of Articles
          </label>
          <label className="a-field a-field--wide">
            <span className="a-field__label">
              Web address
              {mode === "update" && <small>Fixed once created</small>}
            </span>
            <div className="a-prefix">
              <span>/articles/</span>
              <input
                className="a-input"
                value={a.slug}
                disabled={mode === "update"}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugify(e.target.value));
                }}
              />
            </div>
            {err("slug") && <span className="a-msg a-msg--err">{err("slug")}</span>}
          </label>
        </section>

        <section className="a-card">
          <h2>Cover image</h2>
          {a.cover_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- admin preview */}
              <img className="ae__cover" src={a.cover_url} alt="" />
              <label className="a-field a-field--wide">
                <span className="a-field__label">Describe the image</span>
                <input className="a-input" value={a.cover_alt ?? ""} maxLength={200} onChange={(e) => set("cover_alt", e.target.value)} placeholder="e.g. A signed recording contract on a desk" />
              </label>
              <div className="a-actions">
                <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => coverInput.current?.click()} disabled={!!busy}>
                  Replace
                </button>
                <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => set("cover_url", null)}>
                  Remove
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="a-small a-mute">Optional. Without one, the article gets a typographic cover in the brand style.</p>
              <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => coverInput.current?.click()} disabled={!!busy}>
                Upload a cover
              </button>
            </>
          )}
          <input ref={coverInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => (upload(e.target.files?.[0], "cover"), (e.target.value = ""))} />
        </section>

        <div className="be__save">
          {busy && (
            <p className="a-msg" role="status">
              {busy}
            </p>
          )}
          {result && (
            <p className={`a-msg ${result.ok ? "a-msg--ok" : "a-msg--err"}`} role="status">
              {result.message}
            </p>
          )}
          {schedule ? (
            <button type="button" className="a-btn" onClick={() => save("schedule")} disabled={saving || !!busy}>
              {saving ? "Saving…" : "Schedule"}
            </button>
          ) : (
            <button type="button" className="a-btn" onClick={() => save("publish")} disabled={saving || !!busy}>
              {saving ? "Saving…" : a.state === "published" ? "Update article" : "Publish now"}
            </button>
          )}
          <button type="button" className="a-btn a-btn--ghost" onClick={() => save("draft")} disabled={saving || !!busy}>
            {a.state === "draft" ? "Save draft" : "Unpublish (back to draft)"}
          </button>
          {mode === "update" && a.state === "published" && (
            <a className="a-btn a-btn--ghost" href={`/articles/${a.slug}`} target="_blank" rel="noreferrer">
              View on the site ↗
            </a>
          )}
          {mode === "update" &&
            (confirmDelete ? (
              <div className="a-actions">
                <button
                  type="button"
                  className="a-btn a-btn--confirm a-btn--sm"
                  disabled={saving}
                  onClick={() =>
                    startSaving(async () => {
                      const r = await deleteArticle(a.slug);
                      setResult(r);
                      if (r.ok) {
                        setDirty(false);
                        router.replace("/admin/articles");
                      }
                    })
                  }
                >
                  Delete for good
                </button>
                <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" className="a-btn a-btn--danger a-btn--sm" onClick={() => setConfirmDelete(true)}>
                Delete article
              </button>
            ))}
        </div>
      </aside>
    </div>
  );
}
