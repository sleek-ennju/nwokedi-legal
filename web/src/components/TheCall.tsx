import { Suspense } from "react";
import Image, { type StaticImageData } from "next/image";
import CallScrub from "./CallScrub";
import robeBeside from "@/assets/photos/robe-beside.jpg";
import reach from "@/assets/photos/reach.jpg";
import robed from "@/assets/photos/robed.jpg";

type Beat = { img: StaticImageData; title: string; body: string; alt: string; label: string };

const BEATS: Beat[] = [
  {
    img: robeBeside,
    label: "Tradition",
    title: "The tradition.",
    body: "Wig and gown: centuries of advocacy, and the standard every brief is held to.",
    alt: "Smiling beside a barrister's wig and gown on a stand",
  },
  {
    img: reach,
    label: "Choice",
    title: "The choice.",
    body: "To take it on is to carry other people's interests as carefully as your own.",
    alt: "Reaching for the gown on its stand, glancing back over her shoulder",
  },
  {
    img: robed,
    label: "Called",
    title: "Called.",
    body: "Barrister and Solicitor of the Supreme Court of Nigeria — and now at work for you.",
    alt: "Wearing the barrister's wig and gown, smiling",
  },
];

/**
 * "The Call": a depth carousel. The three full-length portraits stand in a
 * shallow arc; the active one steps forward, sharp and spotlit, while the
 * others recede — blurred and dimmed. Scroll, drag/swipe, or use the thumbnails.
 * Every photo is always shown whole: no crops, no masks.
 */
export default function TheCall() {
  return (
    <section className="call" data-cover aria-labelledby="call-title">
      <Suspense fallback={null}>
        <CallScrub />
      </Suspense>
      <div className="call__sticky">
        <div className="call__spot" aria-hidden />
        <div className="call__stage">
          {BEATS.map((b, i) => (
            <figure className="call__card" key={b.title} data-i={i}>
              <Image src={b.img} alt={b.alt} fill placeholder="blur" sizes="(max-width: 760px) 72vw, 40vh" />
            </figure>
          ))}
        </div>

        <div className="call__copy">
          <p className="eyebrow">
            <span className="call__count">
              <b>01</b>
            </span>{" "}
            / 03 · The Call
          </p>
          <h2 className="sr-only" id="call-title">
            The call to the Bar
          </h2>
          <div className="call__beats">
            {BEATS.map((b, i) => (
              <div className={`call__beat${i === 0 ? " is-active" : ""}`} key={b.title}>
                <p className="call__title">{b.title}</p>
                <p className="call__body">{b.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="call__thumbs" role="group" aria-label="Choose a chapter of the story">
          {BEATS.map((b, i) => (
            <button
              className={`call__thumb${i === 0 ? " is-active" : ""}`}
              type="button"
              key={b.title}
              data-to={i}
              aria-label={`${i + 1}: ${b.label}`}
            >
              <Image src={b.img} alt="" width={44} height={55} sizes="44px" />
              <span>{b.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
