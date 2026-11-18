import { Suspense } from "react";
import Image from "next/image";
import gaze from "@/assets/photos/gaze.jpg";
import { site } from "@/lib/site";
import PrincipalLight from "./PrincipalLight";

/**
 * The Principal — the signature moment. Her gaze in this frame rises toward the
 * upper-left: toward the light and the copy. Behaviour lives in PrincipalLight.
 */
export default function Principal() {
  const name = site.principal.name || "The Principal";

  return (
    <section className="principal" id="principal" data-cover aria-labelledby="principal-title">
      <Suspense fallback={null}>
        <PrincipalLight />
      </Suspense>
      <div className="principal__inner">
        <div className="principal__copy">
          <p className="eyebrow">The Principal</p>
          <h2 className="principal__title" id="principal-title">
            {name}
          </h2>
          <p className="principal__role">Founder, {site.name}</p>
          {/* TODO(client): replace with her approved bio */}
          <p className="principal__lead">
            She founded {site.name} in {site.founded} to give creators, founders and growing businesses counsel that
            understands the value of what they make — and how to keep it.
          </p>
          <ul className="principal__facts">
            <li>
              <span>Called to the Nigerian Bar</span>
              <b>Barrister &amp; Solicitor</b>
            </li>
            <li>
              <span>Founded</span>
              <b>{site.name}, {site.founded}</b>
            </li>
            <li>
              <span>Also</span>
              <b>Author</b>
            </li>
          </ul>
        </div>

        <div className="principal__figure">
          <Image
            className="principal__img principal__img--dark"
            src={gaze}
            alt=""
            aria-hidden
            placeholder="blur"
            sizes="(max-width: 760px) 100vw, 46vw"
          />
          <Image
            className="principal__img principal__img--lit"
            src={gaze}
            alt={`${name}, ${site.tagline.toLowerCase()}, in court bands, arms folded, looking up towards the light`}
            sizes="(max-width: 760px) 100vw, 46vw"
          />
          <div className="principal__glow" aria-hidden />
        </div>
      </div>
    </section>
  );
}
