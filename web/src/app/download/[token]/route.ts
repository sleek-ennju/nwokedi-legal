import { getAnyBook as getBook } from "@/lib/books/catalog";
import { sha256 } from "@/lib/crypto/tokens";
import { consumeDownload, signedBookUrl } from "@/lib/db/orders";

const noLeak = { "Referrer-Policy": "no-referrer", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

/**
 * /download/<token> — the link in the buyer's email.
 * The token is hashed and checked (and one use consumed) atomically in the
 * database; the buyer is then redirected to a 60-second signed URL for the
 * private file. The raw token is never stored and never sent onward.
 */
export async function GET(req: Request, { params }: RouteContext<"/download/[token]">) {
  const { token } = await params;
  const origin = new URL(req.url).origin;
  const invalid = () => Response.redirect(`${origin}/download/invalid`, 303);

  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return invalid();

  const row = await consumeDownload(sha256(token));
  if (!row) return invalid();

  const book = await getBook(row.book_slug);
  const path = row.file_path || `${row.book_slug}.pdf`;
  const filename = `${(book?.title ?? row.book_slug).replace(/[^\w\s-]/g, "").trim()}.pdf`;
  const url = await signedBookUrl(path, filename, 60);
  if (!url) {
    console.error("[download] file missing in storage", path);
    return Response.redirect(`${origin}/download/invalid?reason=file`, 303);
  }
  return new Response(null, { status: 302, headers: { Location: url, ...noLeak } });
}
