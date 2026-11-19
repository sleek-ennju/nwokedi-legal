# Nwokedi Legal — Project Plan

> How the firm site, the bookstore, the admin, SEO, performance and mobile all fit together.
> Brand rules live in `BRAND_DOSSIER.md`. The working 3D prototype lives in `site/`.
> Status: draft, 18 Nov 2026. **Waiting on:** new professional photos from the client.

---

## 1. Scope

| Area | What it does |
|---|---|
| **Firm site** | 3D shield hero, four practice chapters, "What are you protecting?", About the Principal (built around the new photos), Insights (articles), Contact/consultation |
| **Bookstore** | Catalogue of her books, a sneak-peek reader, checkout, and delivery to the buyer's email after a successful payment |
| **Admin** | She manages books, orders, customers, enquiries and articles on her own, with no developer needed |
| **SEO** | Searching her name puts her site first |
| **Performance** | Lighthouse ≥ 90 in all four categories, **measured on mobile** (the harder test) |
| **Mobile** | Fully responsive, and the signature interactions still work on a phone |

---

## 2. Architecture

The prototype is a single-page Vite app. That was fine for proving the 3D, but it can't do SEO-grade server rendering, payments or an admin. We'll port it to a full-stack framework, and **the Three.js scene code carries over unchanged**.

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Static pages for SEO and speed, server routes for payments and webhooks, and the admin in the same codebase. Ducrest is built on it too, so there's no capability gap. |
| Hosting | **Vercel (Pro plan)** | Edge CDN and image optimisation. The free Hobby plan doesn't allow commercial use, and she will be selling. |
| Database + auth + files | **Supabase** (Postgres, Auth, Storage) | One service for orders, the admin login and *private* book files, with row-level security. |
| Payments | **Paystack** | Built for Nigeria: Naira, cards, bank transfer and USSD, and it also takes international cards. Verified by webhook with a signature check. |
| Email | **Resend + React Email** | Branded receipt and download emails, and consultation alerts to her. |
| Spam protection | **Cloudflare Turnstile** | Invisible CAPTCHA on the forms, with no puzzles for real people. |
| Analytics | **Vercel Analytics** (cookieless) | Doesn't need a cookie banner and doesn't hurt Lighthouse. |

```
Visitor ──► Next.js on Vercel (static pages + 3D island)
              │
              ├─ /books, /books/[slug]   ◄── book data (Supabase, rebuilt on change)
              ├─ /api/checkout  ───────► Paystack (creates a transaction)
              ├─ /api/paystack/webhook ◄── Paystack (charge.success, signed)
              │        └─► create order → generate download token → Resend email
              ├─ /download/[token]  ───► Supabase Storage signed URL (private bucket)
              └─ /admin/*  (Supabase Auth, admin role only)
```

---

## 3. The bookstore

### 3.1 Pages
- **`/books`**: the shelf. Covers as real objects: on desktop, hovering tilts a book and catches the torch light (same lighting language as the shield). On mobile, the shelf swipes.
- **`/books/[slug]`**: one book.
  - Hero: a **3D book** you can turn with a drag or a swipe, with the real cover mapped on. It's buildwithmb's "real object, not a photo" idea applied to the product.
  - Synopsis, table of contents, price, format, page count, and a "Read a sample" button.
  - **Sneak-peek reader**: a page-turn reader for the free sample. Swipe or tap to turn pages on a phone, arrow keys on desktop.
- **`/checkout/success`**: a "Your book is on its way to {email}" confirmation that waits until the payment is confirmed.

### 3.2 How the sneak peek stays safe
- She uploads the **full file** (PDF/EPUB) to a *private* storage bucket that the public can never reach.
- She sets a **sample range** (e.g. pages 1–12) in the admin. On upload, the server renders only those pages to images (WebP), and that's all the reader ever loads.
- Result: the sample is fast, works on every phone, and **can't be used to rebuild the full book**.

### 3.3 Purchase → email flow
1. The buyer enters a name and email (no account needed) → `/api/checkout` creates a pending order and a Paystack transaction → the Paystack popup opens.
2. They pay with a card, bank transfer or USSD.
3. Paystack calls **`/api/paystack/webhook`**. We check the signature, **re-verify the transaction with Paystack's API**, and confirm the amount and currency match the order. The handler is *idempotent*, so a repeated webhook can't send two emails.
4. The order is marked paid → a download token is created (**expires in 72 h, 5 downloads max**) → Resend sends the branded email with the link.
5. `/download/[token]` checks the token, then hands back a short-lived signed URL to the file.
   - *Optional anti-sharing step:* stamp each PDF's footer with *"Licensed to {buyer email}"* at download time. It discourages sharing without the friction of DRM.
6. If the email bounces, or the buyer asks, she can **resend** from the admin with one click.

We send links rather than attachments. Attachments hit size limits, land in spam more often, and can't be revoked.

### 3.4 Data model (first pass)
`books` (title, slug, synopsis, cover, price_ngn, price_usd, file_path, sample_pages, status) · `orders` (email, name, book_id, amount, currency, paystack_ref, status) · `download_tokens` (order_id, token_hash, expires_at, uses) · `enquiries` (consultation form) · `posts` (Insights) · `admins`

---

## 4. Admin (`/admin`)

Protected by Supabase Auth: email magic link + a second factor, and only accounts flagged as admin can get in. Same brand, quieter UI.

| Screen | What she can do |
|---|---|
| **Overview** | Sales today/month, revenue in ₦ and $, best-selling book, new enquiries |
| **Books** | Add/edit a book, upload the cover and the full file, set the sample pages, prices and publish status. Changes go live within seconds. |
| **Orders** | Search by email or reference, see payment status, **resend the download email**, reset download limits, mark refunded |
| **Customers** | Everyone who bought, with CSV export (for a future mailing list, with consent) |
| **Enquiries** | Consultation requests from the site, marked new/replied |
| **Insights** | Write and publish articles. **This is the biggest SEO lever** (§5). |
| **Settings** | Payment mode (test/live), sender email, download expiry |

### 4.1 Store analytics (in the dashboard)

The goal is decisions, not vanity numbers. We track bookstore behaviour **first-party** (in our own database, cookieless and anonymous) so the dashboard can answer real business questions:

| Question she can answer | Built from |
|---|---|
| Where do buyers drop off? | **Funnel:** store visit → book viewed → sample opened → checkout started → paid |
| Which book converts best, and which needs a better page? | Conversion rate per book, revenue per book |
| Does the sample sell the book? | **Sample read depth** (how many pages people read) vs purchase rate |
| How long from first visit to purchase? | Time-to-purchase, returning-visitor share |
| Where do buyers come from? | Referrer and UTM source (Instagram, LinkedIn, Google, WhatsApp…) |
| Which price or currency works? | ₦ vs $ checkouts, abandoned-checkout rate |
| What device do buyers use? | Mobile/desktop split, country (from edge headers, no IP stored) |

**Events:** `store_view`, `book_view`, `sample_open`, `sample_page {n}`, `checkout_start`, `payment_success`, `payment_abandoned`, `download`, `email_resend`.
**Privacy:** an anonymous session id kept in `sessionStorage`. No cookies, no stored IPs, no cross-site tracking, so it's NDPA-friendly and needs no consent banner. Site-wide traffic and Core Web Vitals come from Vercel Analytics alongside it.
**Dashboard views:** funnel chart, per-book table, revenue over time, top sources, read-depth chart, with date-range filters and CSV export.

---

## 5. SEO: "type her name, her site comes first"

Getting a site to rank first **for a person's own name** is very achievable, much easier than ranking for "IP lawyer Lagos". The one thing we don't control is whether someone famous shares her name. Here's the plan:

**On the site**
1. **A dedicated principal page** (`/about` or `/[her-name]`) with her full name in the title, the H1 and the URL. Bio, call-to-bar year, practice areas, books.
2. **Structured data (JSON-LD):** `Person` (her, with `sameAs` → LinkedIn, Instagram, X, NBA listing, publisher pages), `LegalService` (the firm, with `founder` → her), `Book` for each title (with `author` → her), `Article` for each Insight, `BreadcrumbList`. These all link up so Google sees one coherent entity: a lawyer who is also an author.
3. **The books help:** each book page is another page about her, on her own domain, that people will link to.
4. Technical basics: static HTML, `sitemap.xml`, `robots.txt`, canonical URLs, Open Graph images (branded, auto-generated per page), fast pages (§6).
5. **The 3D never hides content.** All text is real HTML that Google can read without running any JavaScript.

**Off the site (where #1 is actually won)**
6. **Google Search Console** set up on launch day, with the sitemap submitted.
7. **Google Business Profile** for the firm, so it shows in Maps and the local pack.
8. **Consistent identity everywhere:** same name, title, photo and link-back on LinkedIn, Instagram, the NBA directory and her book listings (Amazon/Selar/etc.).
9. **Links back to the site:** publisher and press pages, guest articles, event speaker pages.
10. **Publish Insights regularly** (one or two a month) on IP and entertainment law topics. Fresh, expert content tells Google the site is alive and authoritative.

*Realistic timeline:* the site usually ranks for her exact name within a few weeks of indexing. A Knowledge Panel (the box on the right of Google results) builds up over months as the off-site signals accumulate.

---

## 6. Lighthouse ≥ 90 (mobile) with real 3D

Heavy WebGL and high Lighthouse scores *can* coexist, but only by design. The rules:

| Rule | How |
|---|---|
| **Text paints first** | The hero headline is in the initial HTML and visible immediately, and it becomes the LCP element. **⚠ The prototype currently hides the headline until the intro finishes (~3 s), which would fail LCP. Change for production:** the headline renders instantly and the 3D intro plays around it. |
| **3D loads after first paint** | Three.js loads with a dynamic `import()` once the page is idle, so it never blocks the first render. A tiny inline SVG emblem holds the space so nothing shifts (CLS = 0). |
| **Adaptive quality** | GPU tier detection: *high* = full materials, DPR 2. *Mid* = no clearcoat, DPR 1.5. *Low* = the 3D is replaced with an animated SVG version of the shield draw-in and ignition. |
| **Lean JS** | Separate route bundles: the admin never ships to visitors, the book reader only loads on book pages. |
| **Fonts** | Self-hosted, subsetted, `font-display: swap`, only the weights we use. Agatho too, once licensed. |
| **Images** | Her photos served as AVIF/WebP at the right sizes, with blurred placeholders. |
| **Accessibility** | The contrast table is already checked (BRAND_DOSSIER §5.3), plus focus states, alt text, and a reduced-motion mode. |
| **Best practices** | HTTPS, security headers, no console errors. |
| **Guardrail** | **Lighthouse CI** runs on every deploy and fails the build if any score drops below 90. |

---

## 7. Mobile: keep the magic

The interactions are designed so a phone gets its *own* version, not a cut-down one:

| Interaction | Desktop | Phone |
|---|---|---|
| Hold the light | Pointer moves the lamp | **Tilt the phone** (gyroscope) to move the light. A small "Hold the light" tap grants motion permission on iPhone. Drag works as a fallback. |
| Shield coin-flip chapters | Scroll | Scroll (already working). The shield sits above the text. |
| Torch ignition | Plays on load | Same. A light **haptic pulse** on Android when the torch catches. |
| 3D book | Drag to turn | Swipe to turn |
| Sample reader | Arrow keys / click | Swipe page turns |
| What are you protecting? | Click chips | Tap chips (already working) |

Every screen is tested on a real mid-range Android and an iPhone, not only an emulated viewport.

---

## 8. Photos: built 18 Nov

Built from the four studio portraits (`web/src/assets/photos/`):
- **The Principal, the signature move.** Her portrait ("gaze": arms folded, looking up toward the light) waits in darkness. The visitor's light (pointer on desktop, **phone tilt** on mobile) brings her out of it, and scrolling widens the light until she is fully lit. The layout puts her gaze toward her name and the copy.
- **The Call (v2, 18 Nov).** A depth carousel inspired by the "Try the Look" orbit reference: three full-length portraits on a concave arc. The front one is sharp and spotlit, the others recede (blurred, dimmed). Scroll, drag/swipe or tap the thumbnails to move. Every photo is always shown whole (v1 cropped her head under heavy masks).
- **Colour flow rule.** Navy never blends into umber. The stage dims to warm near-black ("lights down"), umber appears only as light around her, and the cream section slides up as a rounded sheet.
- **Consultation.** A head-and-shoulders portrait clipped to the **brand shield shape**: "You'll hear back from the principal directly."
- Section backgrounds are sampled from the photo backdrop (`--umber-*`), and photo edges are feathered, so the photos sit in the page with no visible frame.
- **Draft copy needing her approval:** the bio line, the three Call captions, and her name (shows "The Principal" until `NEXT_PUBLIC_PRINCIPAL_NAME` is set).

### Original brief for this section

When the new professional shoot arrives:
- **About the Principal**: her portrait cut out from the backdrop and placed in an umber "torchlit" section that matches the photo's warm lighting, with a light reveal as you scroll in.
- **The two-beat moment**: the wig and gown first (tradition), then her (the person behind it).
- Portraits in the Insights article bylines and on the book pages ("About the author").
- **Ask the photographer for:** a full-length shot, a tight half-length shot, one or two candid working shots, and ideally a plain-backdrop version for clean cutouts.

---

## 9. Build phases

| Phase | Deliverable |
|---|---|
| **1. Foundation** | Port the prototype to Next.js, fix the LCP issue, adaptive quality, SEO scaffolding (metadata, schema, sitemap), consultation form, Lighthouse CI **✅ Done 18 Nov.** Mobile Lighthouse with full 3D: Perf 97–99, A11y/BP/SEO 100. The 3D renders in a Web Worker (OffscreenCanvas). |
| **2. Bookstore** | **2a ✅ 18 Nov:** `/books` catalogue (CSS-3D books on a shelf), `/books/[slug]` (draggable 3D book, ₦/$ toggle, page-turn sample reader), checkout sheet → server action → Paystack hosted checkout (test-mode fallback in dev), `/checkout/success` with server-side verification, cookieless funnel events (`/api/events`), Book + Offer + Breadcrumb schema, sitemap. Mobile Lighthouse 100 on every category. **2b ✅ 19 Nov:** Supabase connected (schema + RLS + private bucket); Paystack webhook (HMAC + re-verify + amount match); exactly-once delivery; hashed download tokens (72h / 5 uses, atomic); branded email; 60s signed downloads. Tested end-to-end in test mode. **Needs:** Paystack test key + Resend key/domain to go live. |
| **3. Admin** | **3a ✅ 19 Nov:** `/admin` with Supabase Auth sign-in (password + authenticator-app code, always required; admins table re-checked on every click; 12-hour signed session). Overview (today / month / all-time sales in ₦ and $, visitors, best seller, new enquiries). Orders (search, status filters, download usage, **resend link**, record refund → its links switch off). Store analytics (funnel, visits per day, per-book conversion, sample read depth vs purchase, sources, devices, checkout abandonment; 7 / 30 / 90 days). Customers (+ CSV export). Enquiries (new / replied / archived, with email · call · WhatsApp shortcuts). Accounts via `node web/scripts/admin-user.mjs add / remove / reset-2fa <email>`. **Still to do (3c):** edit books from the dashboard (the catalogue still lives in `src/content/books.ts`), Settings, and the Articles editor (3b). |
| **3b. Articles** *(requested 19 Nov)* | `/articles`: an editorial index (featured piece, then a list filterable by practice area) and `/articles/[slug]` reading pages (beautiful long-form typography, reading time, author byline with her portrait, related articles, share links, "Book a consultation" and "Read the book" call-outs). She writes and publishes from the admin (rich-text editor, cover image, practice tag, draft/scheduled/published). Article + Person structured data, an RSS feed, and sitemap entries. **This is the strongest long-term SEO engine for ranking on her name and topics.** |
| **4. Photos + signature** | About section, gyroscope light, final motion polish |
| **5. Launch** | Domain, Paystack live mode, Search Console, Google Business Profile, real-device QA, final Lighthouse audit |

Phases 2 and 3 can start right away. The photos only block phase 4.

---

## 10. Questions for the client

1. **Her full name, exactly as people search for it**, plus any other names she's known by.
2. **Domain.** Is one already bought? (e.g. `nwokedilegal.com`)
3. **Books:** titles, formats (PDF/EPUB), prices in ₦ and/or $, which pages make the sample, cover art files.
4. **Physical copies ever?** (That would change the checkout: shipping and addresses.)
5. **Paystack:** does she have a business account? Payouts go to her account; we never touch funds.
6. **Refund policy** for digital books.
7. **Her profiles** (LinkedIn, Instagram, X, NBA listing) for the `sameAs` links.
8. **Sender email** for receipts (e.g. `books@` her domain).
9. **Legal pages:** privacy policy (Nigeria Data Protection Act 2023), terms of sale, and the advertising-rules check on all copy.
