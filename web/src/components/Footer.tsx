/* eslint-disable @next/next/no-html-link-for-pages --
   Deliberate full-document links: the home page boots a WebGL worker and a scroll
   timeline once per document, so entering/leaving it must be a real page load. */
import BuiltBy from "./BuiltBy";
import { practices, site } from "@/lib/site";

type Social = { key: keyof typeof site.social; label: string; path: React.ReactNode };

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const SOCIALS: Social[] = [
  {
    key: "instagram",
    label: "Instagram",
    path: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="4.5" {...S} />
        <circle cx="12" cy="12" r="3.6" {...S} />
        <circle cx="16.9" cy="7.1" r="0.9" fill="currentColor" />
      </>
    ),
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    path: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" {...S} />
        <path d="M8.3 10.6v5.6M8.3 7.9v.1M11.6 16.2v-3.3a2.2 2.2 0 0 1 4.4 0v3.3M11.6 10.6v5.6" {...S} />
      </>
    ),
  },
  {
    key: "x",
    label: "X",
    path: <path d="M5 5l14 14M19 5l-5.6 6.2M10.6 12.8 5 19" {...S} />,
  },
  {
    key: "tiktok",
    label: "TikTok",
    path: <path d="M13.5 4v10.2a3.3 3.3 0 1 1-3.3-3.3M13.5 4c.4 2.4 2.1 4 4.5 4.2" {...S} />,
  },
  {
    key: "youtube",
    label: "YouTube",
    path: (
      <>
        <rect x="3.5" y="6.5" width="17" height="11" rx="3.5" {...S} />
        <path d="M10.5 9.8v4.4l3.8-2.2z" fill="currentColor" />
      </>
    ),
  },
];

const digits = (n: string) => n.replace(/[^\d]/g, "");

/**
 * Footer: brand, navigation, direct lines and social profiles, over a giant
 * wordmark set into the ground. Social handles are filled from site.social.
 */
export default function Footer() {
  const { phone, whatsapp } = site.contact;
  return (
    <footer className="foot">
      <div className="foot__inner">
        <div className="foot__brand">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny SVG logo */}
          <img src="/brand/lockup.svg" alt={site.name} width="220" height="38" loading="lazy" />
          <p className="foot__tagline">
            {site.tagline}. Counsel in intellectual property, media &amp; entertainment, corporate &amp; commercial work, and
            property.
          </p>
        </div>

        <nav className="foot__col" aria-label="Practice areas">
          <p className="foot__head">Practice</p>
          <ul>
            {practices.map((p) => (
              <li key={p.id}>
                <a href={`/#${p.id}`}>{p.name}</a>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="foot__col" aria-label="The firm">
          <p className="foot__head">The firm</p>
          <ul>
            <li>
              <a href="/#principal">The Principal</a>
            </li>
            <li>
              <a href="/#protect">Find your counsel</a>
            </li>
            <li>
              <a href="/#consult">Request a consultation</a>
            </li>
            <li>
              <a href="/books">Books</a>
            </li>
            <li>
              <a href="/articles">Articles</a>
            </li>
          </ul>
        </nav>

        <div className="foot__col">
          <p className="foot__head">Reach us</p>
          <ul>
            <li>
              {whatsapp ? (
                <a href={`https://wa.me/${digits(whatsapp)}`} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              ) : (
                <span className="foot__pending">WhatsApp</span>
              )}
            </li>
            <li>{phone ? <a href={`tel:+${digits(phone)}`}>Call</a> : <span className="foot__pending">Call</span>}</li>
            {site.email && (
              <li>
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </li>
            )}
          </ul>
          <ul className="foot__social" aria-label="Social profiles">
            {SOCIALS.map((s) => {
              const url = site.social[s.key];
              const icon = (
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                  {s.path}
                </svg>
              );
              return (
                <li key={s.key}>
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer me" aria-label={s.label}>
                      {icon}
                    </a>
                  ) : (
                    <span className="is-pending" role="img" aria-label={`${s.label}: coming soon`} title={`${s.label} — coming soon`}>
                      {icon}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="foot__base">
        <p>
          © {site.name}. {site.tagline} of the Supreme Court of Nigeria.
        </p>
        <p className="foot__muted">This website is for general information only and is not legal advice.</p>
        <BuiltBy />
      </div>

      <div className="foot__mark" aria-hidden />
    </footer>
  );
}
