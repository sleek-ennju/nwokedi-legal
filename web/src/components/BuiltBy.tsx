import { site } from "@/lib/site";

/**
 * "Built by CodeWithSleek": small and quiet on the client's site, with one
 * CodeWithSleek touch on hover: Sky Cyan light runs along an underline that
 * draws itself, the mark turns a few degrees, the arrow lifts.
 */
export default function BuiltBy() {
  const inner = (
    <>
      <span className="built__label">Built by</span>
      {/* eslint-disable-next-line @next/next/no-img-element -- 16px mark */}
      <img className="built__mark" src="/brand/codewithsleek-mark.png" alt="" width={19} height={16} />
      <span className="built__word">
        <b>CODE</b>withSleek
      </span>
      {site.credit.url && (
        <svg className="built__arrow" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
          <path d="M3 9l6-6M4.5 3H9v4.5" />
        </svg>
      )}
    </>
  );
  return site.credit.url ? (
    <a className="built" href={site.credit.url} target="_blank" rel="noopener" aria-label="Built by CodeWithSleek (opens in a new tab)">
      {inner}
    </a>
  ) : (
    <span className="built">{inner}</span>
  );
}
