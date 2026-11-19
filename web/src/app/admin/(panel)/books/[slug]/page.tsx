import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BookEditor from "@/components/admin/BookEditor";
import { getBookAdmin } from "@/lib/admin/books";
import { day } from "@/lib/admin/format";
import "../../../../books.css";

export const metadata: Metadata = { title: "Edit book" };

export default async function EditBookPage({ params }: PageProps<"/admin/books/[slug]">) {
  const { slug } = await params;
  const data = await getBookAdmin(slug);
  if (!data) notFound();

  return (
    <>
      <header className="a-head">
        <div>
          <Link href="/admin/books" className="a-back">
            ← Books
          </Link>
          <h1>{data.book.title}</h1>
          <p>
            {data.sold ? `${data.sold} sold` : "No sales yet"}
            {data.updatedAt && ` · last saved ${day(data.updatedAt)}`}
          </p>
        </div>
      </header>
      <BookEditor initial={data.book} mode="update" file={data.file} sold={data.sold} key={data.updatedAt ?? slug} />
    </>
  );
}

/** Admin screens read the session and live data on every request, so they block rather than prerender. */
export const instant = false;
