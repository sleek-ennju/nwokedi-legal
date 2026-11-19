import type { Metadata } from "next";
import Link from "next/link";
import BookEditor from "@/components/admin/BookEditor";
import { requireAdmin } from "@/lib/admin/session";
import { site } from "@/lib/site";
import type { Book } from "@/lib/books/types";
import "../../../../books.css";

export const metadata: Metadata = { title: "New book" };

export default async function NewBookPage() {
  await requireAdmin();
  const blank: Book = {
    slug: "",
    title: "",
    author: site.principal.name ? `${site.principal.name} Esq.` : "Miriam Nwokedi Esq.",
    year: "2026",
    format: "PDF",
    pages: 0,
    price: { NGN: 0 },
    hook: "",
    synopsis: [],
    contents: [],
    forWhom: [],
    cover: {},
    sample: [],
    status: "draft",
  };
  return (
    <>
      <header className="a-head">
        <div>
          <Link href="/admin/books" className="a-back">
            ← Books
          </Link>
          <h1>New book</h1>
          <p>It starts as a draft, hidden from the site until you put it on sale.</p>
        </div>
      </header>
      <BookEditor initial={blank} mode="create" file={null} sold={0} />
    </>
  );
}

/** Admin screens read the session and live data on every request, so they block rather than prerender. */
export const instant = false;
