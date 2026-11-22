import { Suspense } from "react";
import Stage from "@/components/Stage";
import ProtectPicker from "@/components/ProtectPicker";
import ConsultForm from "@/components/ConsultForm";
import DirectContact from "@/components/DirectContact";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import Principal from "@/components/Principal";
import TheCall from "@/components/TheCall";
import Image from "next/image";
import consultPortrait from "@/assets/photos/consult-portrait.jpg";
import { practices, site } from "@/lib/site";

export default function Home() {
  return (
    <>
      <Stage />

      <Nav />

      <main>
        {/* HERO — the h1 is static HTML and paints immediately (it is the LCP element) */}
        <section className="hero" id="top">
          <div className="hero__copy">
            <p className="eyebrow fade-in">
              {site.tagline} · Est. {site.founded}
            </p>
            <h1 className="display">
              Protecting talent, <em className="lit">securing legacies.</em>
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

        {/* THE PRINCIPAL — the signature move: bring her into the light */}
        <Principal />

        {/* THE CALL — a scroll-scrubbed robing sequence */}
        <TheCall />

        {/* WHAT ARE YOU PROTECTING? */}
        <section className="protect" id="protect" data-theme="light" data-cover>
          <div className="protect__inner">
            <p className="eyebrow eyebrow--ink">Find your counsel</p>
            <h2 className="protect__title">
              What are you <em>protecting?</em>
            </h2>
            {/* Suspense boundaries let React hydrate below-the-fold islands in separate, short tasks */}
            <Suspense fallback={null}>
              <ProtectPicker />
            </Suspense>
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
        <section className="consult" id="consult" data-theme="light" data-cover aria-labelledby="consult-title">
          <div className="consult__inner">
            <div className="consult__intro">
              <figure className="consult__portrait">
                <div className="consult__frame">
                  <Image
                    src={consultPortrait}
                    alt={`${site.principal.name || "The principal"}, seated in a cream blazer, ready to hear about your matter`}
                    placeholder="blur"
                    fill
                    sizes="(min-width: 1024px) 320px, (min-width: 640px) 260px, 220px"
                  />
                </div>
              </figure>
              <p className="eyebrow eyebrow--ink">Request a consultation</p>
              <h2 className="consult__title" id="consult-title">
                Tell us <em>what you need.</em>
              </h2>
              <p>
                A few lines are enough. We&apos;ll come back to you with next steps and, where it helps, a time to speak.
              </p>
              <p className="consult__with">You&apos;ll hear back from the principal directly.</p>
              <DirectContact />
            </div>
            <Suspense fallback={null}>
              <ConsultForm />
            </Suspense>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
