import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Toaster from "@/components/Toaster";
import SmoothScroll from "@/components/SmoothScroll";
import { Suspense } from "react";
import { site } from "@/lib/site";
import { serializeJsonLd, siteGraph } from "@/lib/jsonld";
import "./globals.css";
import "./photos.css";

// Display serif stand-in until the licensed Agatho webfont arrives (BRAND_DOSSIER §11.3)
const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const sans = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-sans",
  display: "swap",
});

const title = `${site.name} — ${site.tagline}`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: title, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "/",
    siteName: site.name,
    title,
    description: site.description,
  },
  twitter: { card: "summary_large_image", title, description: site.description },
  robots:
    process.env.SITE_NOINDEX === "1"
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#16253D",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-NG" className={`no-js ${serif.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.remove('no-js')" }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(siteGraph()) }} />
        {children}
        <Toaster />
        <Suspense>
          <SmoothScroll />
        </Suspense>
        {/* the analytics script is served by Vercel's edge; elsewhere it would 404 */}
        {process.env.VERCEL && <Analytics />}
      </body>
    </html>
  );
}
