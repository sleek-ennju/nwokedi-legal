import { site } from "@/lib/site";

const digits = (n: string) => n.replace(/[^\d]/g, "");

/** "+2348012345678" → "+234 801 234 5678" (Nigerian mobile grouping; other formats pass through) */
const pretty = (n: string) => {
  const d = digits(n);
  if (d.startsWith("234") && d.length === 13) return `+234 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
  return n;
};

const WA_TEXT = `Hello, I'd like to arrange a consultation with ${site.name}.`;

/**
 * Direct lines beside the enquiry form, for people who'd rather talk now.
 * TODO(client): numbers come from NEXT_PUBLIC_PHONE / NEXT_PUBLIC_WHATSAPP.
 * Until they're set, the rows render as placeholders without links.
 */
export default function DirectContact() {
  const { phone, whatsapp } = site.contact;
  const rows = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      note: "Message us — we reply in working hours",
      number: whatsapp,
      href: whatsapp ? `https://wa.me/${digits(whatsapp)}?text=${encodeURIComponent(WA_TEXT)}` : "",
      external: true,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 3.2a8.8 8.8 0 0 0-7.6 13.2L3.3 20.7l4.4-1.1A8.8 8.8 0 1 0 12 3.2Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M9.2 8.3c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .5.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.1-.1.3 0 .5.5.9 1.3 1.7 2.2 2.2.2.1.4.1.5 0l.6-.6c.2-.2.4-.2.6-.1l1.6.8c.3.1.4.3.3.6-.1.8-.9 1.6-1.8 1.6-2.6 0-5.6-3-5.6-5.6 0-.5.2-1.1.4-1.4Z"
            fill="currentColor"
          />
        </svg>
      ),
    },
    {
      key: "phone",
      label: "Call",
      note: "Speak to us directly",
      number: phone,
      href: phone ? `tel:+${digits(phone)}` : "",
      external: false,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M6.6 3.8h2.2c.4 0 .7.3.8.6l.9 3.3c.1.3 0 .7-.3.9l-1.6 1.2a11 11 0 0 0 5.6 5.6l1.2-1.6c.2-.3.6-.4.9-.3l3.3.9c.3.1.6.4.6.8v2.2c0 1-.8 1.8-1.8 1.8C10.3 19.2 4.8 13.7 4.8 5.6c0-1 .8-1.8 1.8-1.8Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="direct" aria-label="Direct contact">
      <p className="direct__title">Rather talk now?</p>
      <ul className="direct__list">
        {rows.map((r) => {
          const inner = (
            <>
              <span className="direct__icon">{r.icon}</span>
              <span className="direct__text">
                <b>{r.label}</b>
                <span>{r.number ? pretty(r.number) : "+234 ··· ··· ····"}</span>
              </span>
              <span className="direct__note">{r.note}</span>
              <svg className="direct__arrow" width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                <path d="M4 12 12 4M6 4h6v6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </>
          );
          return (
            <li key={r.key}>
              {r.href ? (
                <a
                  className="direct__row"
                  href={r.href}
                  {...(r.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  aria-label={`${r.label} ${pretty(r.number)}`}
                >
                  {inner}
                </a>
              ) : (
                <span className="direct__row is-pending">
                  {inner}
                  <span className="sr-only">Number coming soon</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
