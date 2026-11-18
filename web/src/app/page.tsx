import Stage from "@/components/Stage";
import ProtectPicker from "@/components/ProtectPicker";
import ConsultForm from "@/components/ConsultForm";
import { practices, site } from "@/lib/site";

export default function Home() {
  return (
    <>
      <Stage />

      <header className="nav">
        <a className="nav__brand" href="#top" aria-label={`${site.name}, home`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny SVG logo */}
          <img className="logo-cream" src="/brand/lockup.svg" alt={site.name} width="190" height="33" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo-ink" src="/brand/lockup-ink.svg" alt="" width="190" height="33" />
        </a>
        <nav className="nav__links" aria-label="Primary">
          <a href="#practice">Practice</a>
          <a href="#protect">Find your counsel</a>
          <a href="#consult" className="nav__cta">
            <span className="seal-dot" />
            Consultation
          </a>
        </nav>
      </header>

      <main>
        {/* HERO — the h1 is static HTML and paints immediately (it is the LCP element) */}
        <section className="hero" id="top">
          <div className="hero__copy">
            <p className="eyebrow fade-in">
              {site.tagline} · Est. {site.founded}
            </p>
            <h1 className="display">
              Bringing <em className="lit">to light</em> what is yours.
            </h1>
          </div>
          <div className="hero__aside fade-in">
            <p>
              Counsel in intellectual property, media &amp; entertainment, corporate &amp; commercial work, and property
              — for the people and businesses who make things worth protecting.
            </p>
            <a className="textlink" href="#practice">
              Explore the practice <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className="hero__hint fade-in" aria-hidden="true">
            <span />
            Move to hold the light
          </div>
          <button className="tilt-btn" type="button">
            <span className="seal-dot" />
            Tilt to hold the light
          </button>
        </section>

        {/* PRACTICE CHAPTERS */}
        <section className="chapters" id="practice" aria-label="Practice areas">
          <div className="chapters__sticky">
            <div className="rail" aria-hidden="true">
              <span className="rail__fill" />
            </div>
            <div className="chapters__panels">
              {practices.map((p, i) => (
                <article className={`chapter${i === 0 ? " is-active" : ""}`} id={p.id} key={p.id}>
                  <p className="eyebrow">
                    <b>{String(i + 1).padStart(2, "0")}</b> / 04 · Practice
                  </p>
                  <h2>{p.name}</h2>
                  <p className="chapter__tag">{p.tag}</p>
                  <p className="chapter__body">{p.body}</p>
                  <ul className="chapter__list">
                    {p.list.map((li) => (
                      <li key={li}>{li}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* WHAT ARE YOU PROTECTING? */}
        <section className="protect" id="protect" data-theme="light">
          <div className="protect__inner">
            <p className="eyebrow eyebrow--ink">Find your counsel</p>
            <h2 className="protect__title">
              What are you <em>protecting?</em>
            </h2>
            <ProtectPicker />
          </div>
        </section>

        {/* BOOKEND — the shield returns */}
        <section className="bookend" aria-labelledby="bookend-title">
          <div className="bookend__inner">
            <p className="eyebrow">Consultation</p>
            <h2 className="display display--sm" id="bookend-title">
              Bring it <em className="lit">to light.</em>
            </h2>
            <p className="bookend__body">Tell us what you&apos;re building, signing or defending.</p>
            <a className="button" href="#consult">
              <span className="seal-dot" />
              Start a consultation
            </a>
          </div>
        </section>

        {/* CONSULTATION — a letter on vellum */}
        <section className="consult" id="consult" data-theme="light" aria-labelledby="consult-title">
          <div className="consult__inner">
            <div className="consult__intro">
              <p className="eyebrow eyebrow--ink">Request a consultation</p>
              <h2 className="consult__title" id="consult-title">
                Tell us <em>what you need.</em>
              </h2>
              <p>
                A few lines are enough. We&apos;ll come back to you with next steps and, where it helps, a time to speak.
              </p>
            </div>
            <ConsultForm />
          </div>
        </section>
      </main>

      <footer className="foot">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/emblem.svg" alt="" width="34" height="44" loading="lazy" />
        <p>
          © {site.name}. {site.tagline}.
        </p>
        <p className="foot__muted">This website is for general information only and is not legal advice.</p>
      </footer>
    </>
  );
}
