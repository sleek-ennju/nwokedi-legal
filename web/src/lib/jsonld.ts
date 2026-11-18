import { practices, site } from "./site";

/** Escape `<` so a value can never close the <script> tag (XSS-safe JSON-LD). */
export const serializeJsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

const clean = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== "" && v !== undefined && !(Array.isArray(v) && v.length === 0))
  );

/**
 * One connected graph: WebSite ↔ LegalService (the firm) ↔ Person (the principal).
 * Book entities will join this graph in Phase 2 with `author` → the Person @id.
 */
export function siteGraph() {
  const firmId = `${site.url}/#firm`;
  const personId = `${site.url}/#principal`;
  const hasPrincipal = site.principal.name.length > 0;

  const firm = clean({
    "@type": "LegalService",
    "@id": firmId,
    name: site.name,
    legalName: site.legalName,
    url: site.url,
    logo: `${site.url}/brand/icon-512.png`,
    image: `${site.url}/opengraph-image.png`,
    description: site.description,
    foundingDate: site.founded,
    email: site.email,
    telephone: site.telephone,
    areaServed: { "@type": "Country", name: "Nigeria" },
    knowsAbout: practices.map((p) => p.name),
    address: site.address.locality
      ? {
          "@type": "PostalAddress",
          addressLocality: site.address.locality,
          addressRegion: site.address.region,
          addressCountry: site.address.country,
        }
      : undefined,
    founder: hasPrincipal ? { "@id": personId } : undefined,
    sameAs: site.sameAs,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Practice areas",
      itemListElement: practices.map((p) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: p.name, description: p.short },
      })),
    },
  });

  const person = hasPrincipal
    ? clean({
        "@type": "Person",
        "@id": personId,
        name: site.principal.name,
        jobTitle: site.principal.jobTitle,
        worksFor: { "@id": firmId },
        url: site.url,
        sameAs: site.principal.sameAs,
        knowsAbout: practices.map((p) => p.name),
      })
    : null;

  const website = {
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    url: site.url,
    name: site.name,
    publisher: { "@id": firmId },
    inLanguage: "en-NG",
  };

  return {
    "@context": "https://schema.org",
    "@graph": [website, firm, ...(person ? [person] : [])],
  };
}
