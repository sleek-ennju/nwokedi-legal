import type { Metadata } from "next";
import Link from "next/link";
import { updateEnquiry } from "../../actions/manage";
import { ENQUIRY_STATUSES, listEnquiries, type EnquiryStatus } from "@/lib/admin/data";
import { when } from "@/lib/admin/format";

export const metadata: Metadata = { title: "Enquiries" };

const LABEL: Record<EnquiryStatus, string> = { new: "New", replied: "Replied", archived: "Archived" };

export default async function EnquiriesPage({ searchParams }: PageProps<"/admin/enquiries">) {
  const raw = (await searchParams).status;
  const status = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  const { enquiries, counts } = await listEnquiries(status);

  return (
    <>
      <header className="a-head">
        <div>
          <h1>Enquiries</h1>
          <p>Consultation requests from the website. Reply by email or phone, then mark them replied.</p>
        </div>
      </header>

      <div className="a-toolbar">
        <nav className="a-tabs" aria-label="Filter by status">
          <Link href="/admin/enquiries" aria-current={!status ? "page" : undefined}>
            Open<span>{counts.new + counts.replied}</span>
          </Link>
          {ENQUIRY_STATUSES.map((s) => (
            <Link key={s} href={`/admin/enquiries?status=${s}`} aria-current={status === s ? "page" : undefined}>
              {LABEL[s]}
              <span>{counts[s]}</span>
            </Link>
          ))}
        </nav>
      </div>

      {enquiries.length ? (
        <div className="a-enq">
          {enquiries.map((e) => {
            const subject = encodeURIComponent(`Your consultation request — ${e.practice}`);
            const tel = e.phone?.replace(/[^\d+]/g, "");
            return (
              <article key={e.id} className="a-card a-enq__item">
                <div className="a-enq__who">
                  <strong>{e.name}</strong>
                  <span className={`a-pill a-pill--${e.status}`}>{LABEL[e.status]}</span>
                  <span className="a-small a-mute">
                    {e.practice} · {when(e.created_at)}
                  </span>
                </div>
                <form action={updateEnquiry} className="a-actions">
                  <input type="hidden" name="id" value={e.id} />
                  {e.status !== "replied" && (
                    <button className="a-btn a-btn--ghost a-btn--sm" name="status" value="replied">
                      Mark replied
                    </button>
                  )}
                  {e.status !== "archived" ? (
                    <button className="a-btn a-btn--ghost a-btn--sm" name="status" value="archived">
                      Archive
                    </button>
                  ) : (
                    <button className="a-btn a-btn--ghost a-btn--sm" name="status" value="new">
                      Reopen
                    </button>
                  )}
                </form>
                <p className="a-enq__msg">{e.message}</p>
                <div className="a-enq__contact">
                  <a className="a-btn a-btn--sm" href={`mailto:${e.email}?subject=${subject}`}>
                    Email {e.email}
                  </a>
                  {tel && (
                    <>
                      <a className="a-btn a-btn--ghost a-btn--sm" href={`tel:${tel}`}>
                        Call {e.phone}
                      </a>
                      <a className="a-btn a-btn--ghost a-btn--sm" href={`https://wa.me/${tel.replace(/^\+/, "")}`} target="_blank" rel="noreferrer">
                        WhatsApp
                      </a>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="a-card">
          <p className="a-empty">{status ? `No ${LABEL[status as EnquiryStatus]?.toLowerCase() ?? ""} enquiries.` : "No open enquiries. You're all caught up."}</p>
        </section>
      )}
    </>
  );
}

/** Admin screens read the session and live data on every request, so they block rather than prerender. */
export const instant = false;
