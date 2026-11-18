# Nwokedi Legal — Brand Dossier

> **Status: LOCKED, 18 Nov 2026.** §11 is the binding summary. Change it only with an explicit decision.
>
> Working reference for the website build. Everything here was read from the client's brand kit in `NWOKEDI LEGAL/`, the official call-to-Bar photo, the client brief, the Ducrest Partners reference, and @buildwithmb's work.

---

## 1. The brief, in one line

**Position Nwokedi Legal as an experienced firm in four practices:**

1. Intellectual Property
2. Media & Entertainment
3. Corporate & Commercial
4. Property (Real Estate)

The word that matters most in her answer is **"experienced"**. The firm was **established in 2025**, so the site has to make a young firm read as established. That comes from craft, restraint and confidence, not from inflated claims. Every design decision should answer one question: *does this make the firm feel seasoned?*

---

## 2. Brand kit inventory

| Asset | Files | Notes |
|---|---|---|
| **Icon + wordmark** (primary lockup) | `icon+wordmark/` (6 PNGs, 4028×703) | Wordmark split by the shield: `NWOKEDI [shield] LEGAL` |
| **Brand emblem** (shield monogram) | `brand emblem/` (6 PNGs, 1197×1559) | Shield with serif **N** at the top, **L** at the bottom, and a torch between them |
| **Wordmark only** | `wordmark/` (3 PNGs, 3017×276) | `NWOKEDI LEGAL` |
| **Vectors** | `SVG/NLvariation-09…12.svg` | 09/10 = horizontal lockup, 11/12 = emblem. Variants 10 and 12 carry cream `#E9E1CE`, so they're built for dark backgrounds. **Use the SVGs on the web.** |
| Colour and type sheet | `Type and color.jpg` | Palette and typefaces |
| Designer's rationale | `presentation.pdf` (by Orik Creative) | See §3 |
| Portrait | `official_callToBar_photo.jpeg` (2616×3270) | See §6 |

Each set comes in these colourways: all-black, all-cream, all-white, and black/cream/white + colour (red and gold torch).

---

## 3. Symbolism (from the designer)

- **Elegant serif.** Meant to read as "fresh vintage and luxury".
- **Shield.** Stands for strength and defence.
- **Torch.** Stands for *bringing to light* and enlightenment. In the mark, the torch flame is drawn as flowing ribbons (red) over a cut handle (gold).
- **Three forms.** Lockup, standalone emblem, wordmark.
- **Designed** to stand out, and for instant recognition and memorability.

**What this means for the web:** the torch is the brand's built-in motion idea. "Bringing to light" can be the site's whole narrative device: things come out of darkness, light sweeps across type, and a flame ribbon traces the way through the scroll. The shield gives a hard geometric frame (a pointed pentagon) that can be reused for crops, masks and section dividers.

---

## 4. Typography

| Role | Typeface | Character | Source |
|---|---|---|---|
| Display / headings | **Agatho** | High-contrast, flared, vintage-luxury serif. The wordmark is set in it. | Commercial font (not on Google Fonts). **We need the licence and the webfont files from the client or Orik Creative.** |
| Body / UI / labels | **Space Grotesk** | Geometric grotesk with quirky details (the single-storey `y`, the open `a`). Modern counterweight to the serif. | Google Fonts, free |

**Pairing notes**
- Agatho at very large sizes is where the luxury shows. Use it big, with tight tracking (−1% to −2%), and let lines break on purpose.
- Space Grotesk in widely tracked uppercase (`EST. 2025` style, tracking +0.3em) works for eyebrows, labels and numerals. This is already in the brand deck (p.5–6).
- **Fallback if Agatho is late:** Cormorant Garamond or Fraunces (soft, high optical size) get closest. Treat that as a temporary stand-in only.
- Agatho italic, if it exists in the family, is our accent voice (Ducrest does the same with EB Garamond italic). Check which weights are licensed.

---

## 5. Colour system

### 5.1 Official palette (from `Type and color.jpg`)

| Name | Hex | Role |
|---|---|---|
| **Midnight Navy** | `#16253D` | Primary ground. Authority, depth, night. |
| **Parchment Cream** | `#E9E1CE` | Primary light ground and the text colour on navy. Paper, vellum, legal documents. |
| **Bronze** | `#856244` | Brand metal. Wordmark colour on the type sheet. Warmth and heritage. |
| **Seal Red** | `#C61C23` | Torch flame. The single "charge" colour. Wax seal, urgency, passion. |

### 5.2 Hidden fifth colour (from the SVGs)

| Name | Hex | Role |
|---|---|---|
| **Torch Gold** | `#EDAF24` | Used only in the torch handle. It isn't on the official sheet, but it is in the mark. |

**Rule:** Torch Gold belongs to the logo and to moments of light (glow, a highlight sweep, a hover spark). It is **never** a fill or a text colour. Saving it for these moments is what keeps it feeling special.

### 5.3 Measured contrast (WCAG 2.x)

| Foreground on background | Ratio | Verdict |
|---|---|---|
| Cream on Navy | **11.80** | AAA at any size. **Our hero pairing.** |
| Navy on Cream | **11.80** | AAA. Our editorial / reading pairing. |
| Cream on Ink `#0B1322` | **14.26** | AAA. Deepest night sections. |
| Torch Gold on Navy | **7.88** | AAA, but reserve it for accents only (see rule above) |
| Light Bronze `#B08A64` on Navy | **4.88** | AA for body text. **Use this instead of brand bronze on navy.** |
| Seal Red on Cream | **4.49** | AA for large text only; borderline for body text |
| Cream on Seal Red | **4.49** | AA for large text / buttons with bold labels |
| White on Seal Red | **5.85** | AA. Better for small labels on red. |
| Bronze on Cream | **4.21** | AA for large text only (≥24px, or ≥18.66px bold) |
| Bronze on Navy | **2.80** | ❌ Fails. Fine for decorative rules, hairlines and the logo; never for text. |
| Seal Red on Navy | **2.63** | ❌ Fails. Fine as a graphic mark (flame, dot, underline); never for text. |
| Torch Gold on Cream | **1.50** | ❌ Fails. Never. |

### 5.4 The perfect pairs

**Pair A: "Chambers" (Navy × Cream).** *The signature.*
The 11.8:1 contrast is the backbone of the brand: hero, navigation and footer. It reads as old-world counsel with modern clarity. Bronze provides the hairlines, Seal Red appears as one mark per screen at most.

**Pair B: "Vellum" (Cream × Navy text × Bronze).**
For practice pages, insights and long reading. Cream paper, navy ink, bronze for rules, numerals and eyebrows (large sizes only). It feels like a well-bound legal brief.

**Pair C: "Seal" (Navy × Seal Red, used sparingly).**
Red is the wax seal on the letter: the CTA dot, an active-state underline, the flame ribbon in motion. **At most one red element per viewport.** Used like this it feels expensive; used freely it starts to look like a fast-food brand.

**Pair D: "Torchlight" (Navy × Torch Gold glow).**
Gold appears only as *light*: a radial glow behind the emblem, a sweep across Agatho type on reveal, a cursor halo. This pair carries the "bringing to light" story.

**Pair E: "Studio" (Bronze/Umber × Cream).** *The photo's own palette.*
See §6. The portrait backdrop is a warm umber that sits in the same family as the brand bronze. The "About the Principal" section can use a deep umber ground (`#3A2410` → `#5F3501`) with cream type, so the photo melts into the page with no visible edge.

### 5.5 Extended tokens (derived, for UI depth)

```css
:root {
  /* Core */
  --navy:        #16253D;
  --cream:       #E9E1CE;
  --bronze:      #856244;
  --seal:        #C61C23;
  --torch:       #EDAF24;

  /* Derived */
  --ink:         #0B1322; /* deeper navy for night sections, 14.3:1 with cream */
  --navy-2:      #1E3150; /* raised surfaces/cards on navy */
  --navy-line:   rgba(233,225,206,.12); /* hairlines on navy */
  --cream-2:     #F3EEE3; /* lighter paper */
  --cream-3:     #DDD2BA; /* pressed paper / borders on cream */
  --bronze-lt:   #B08A64; /* bronze that passes AA on navy */
  --bronze-dk:   #5E4430; /* bronze text on cream (AA for body text) */
  --umber:       #3A2410; /* photo-matched dark ground */
  --umber-2:     #5F3501; /* photo backdrop mid-tone */
}
```

**Ratio of use (60/30/7/2/1):** Navy 60 · Cream 30 · Bronze 7 · Red 2 · Gold 1.

---

## 6. The official portrait

`official_callToBar_photo.jpeg`: full-length studio portrait, 2616×3270, professionally lit.

- **Subject:** the principal, standing to the right of frame and smiling warmly. She wears a black fitted dress with a white bias-tape line motif, a white lace bar collar with bands, a gold bangle, a watch and rings. Her pose is confident and approachable.
- **Prop:** the barrister's wig and gown on a C-stand to the left. It's the call-to-Bar symbol, given equal visual weight to her.
- **Backdrop:** a warm umber/ochre painted canvas with a vignette (`#341904` at the corners, `#5F3501` → `#804D14` at the centre, floor `#775025`).
- **Light:** warm key light from camera left, soft fall-off. It reads as golden hour or torchlight.

**Why this matters**
1. **The photo is already on-brand.** The backdrop sits in the Bronze family and the lighting reads as torchlight. We don't fight it; we build a section around it.
2. **The wig and gown are a ready-made scroll moment.** Composition idea: the gown and wig enter first (tradition), then she is revealed beside them (the person behind the tradition). It's a two-beat story taken straight from the photo.
3. **The white bias-tape lines on her dress echo the bronze hairlines and the flowing torch ribbons.** That motif can carry into the line-drawing animations.
4. **The photo needs to be background-separated** (a cutout) for depth and parallax effects. Plan a high-quality matte. Her curly hair is the hard part, so expect manual refinement.
5. **Gaps:** there's only one photo. A premium firm site needs more: (a) a tighter half-length crop, (b) a candid working shot, (c) office/texture details. **Ask the client** whether there are more photos from the same shoot.

---

## 7. Reference 1: Ducrest Partners (client's pick)

[ducrestpartners.com](https://ducrestpartners.com/): a Lagos/Abuja IP, technology and entertainment firm. **This is the direct competitor tier.** Their practice list overlaps hers: IP, Media & Entertainment, Corporate, Real Estate.

**What they do well (and we must match)**
- **Stack:** Next.js. EB Garamond (serif) + Inter (sans).
- **Palette:** deep aubergine/oxblood (`#580B1D`, `#28131E`) with champagne gold (`#C8AD7B`) and bone (`#F3EFE9`). It's one dark, rich ground with one metal, which is structurally the same recipe as ours (Navy + Bronze).
- **Hero:** full-bleed partner portrait, with a two-line serif headline in which the second line is *italic*.
- **Vertical rail text:** `LAGOS / ABUJA — NIGERIA` runs up the right edge.
- **Numbered system:** `01 / THE FIRM`, `01 / PRACTICE AREA`. Eyebrows with a leading hairline.
- **Big outlined marquee text:** *"Protecting ideas. Building value."* in solid serif followed by an outlined italic.
- **Content architecture:** Firm → Practice areas (8) → Four pillars → Sectors (7) → People → "Let's talk".
- **A considered privacy/cookie modal** (necessary-only). It's a trust signal for a law firm.

**Where we beat them**
- Their motion is conventional: fades and a marquee. **There's no signature interactive moment.**
- There's no use of the brand mark as a storytelling device.
- The hero is a stock-style group photo, so there's no narrative.
- → **We win on motion, narrative and one unforgettable interaction.** That's exactly where @buildwithmb's approach comes in.

---

## 8. Reference 2: @buildwithmb (motion and presentation standard)

Profile: *Web Dev & Tech Tutor* (90.4K likes). The three pinned posts and the 31.9K post:

| Post | Views | What it is |
|---|---|---|
| **Coca-Cola** (pinned) | 206.5K | A 3D Coke can as the hero on a full-bleed red ground, with a giant brand wordmark behind it. Prompt: "Coke with… [type a name]", which personalises the can live. |
| **Pepsi** (pinned) | 102.9K | A 3D Pepsi can floating in front of oversized `PEPSI` display type, over a landscape/meadow scene. Tagline: "Shake it. Hear it." |
| **Porsche GT3 RS** (pinned) | 84.1K | A 3D car you configure with scroll: "**The paint.** Choose a colour. The car repaints as you pick, because it is a real model on your screen and not a film of one." |
| **HitchaRide** | 31.9K | A ride-share product site. A bright-blue ground, a 3D SUV, "**Room for one more. On thirty.**", plus a route line that draws itself as you scroll ("One car, 4 colleagues commuting to work"). |

Related posts show the same system: a Mercedes-AMG GT with *"First, the engine. A 4.0 litre V8…"* as a wireframe or particle engine assembling, and a colour-swatch row for paint.

### The buildwithmb formula (decoded)

1. **One hero object, rendered for real.** Not a photo but a live 3D/WebGL object that is *the brand itself* (the can, the car).
2. **Oversized display type behind the object.** The type sets the scale and the object breaks the plane in front of it.
3. **Scroll as narrative, chapter by chapter.** "First, the engine… The paint… Room for one more." Each scroll stop is one idea in one sentence with one transformation.
4. **The object transforms with the story.** It assembles from particles or wireframe, rotates, repaints, and draws its route.
5. **One interaction the visitor *does*.** Type your name on the can, pick a paint, drag to turn. This is the "magician" moment people film and share.
6. **Copy that is short, confident and a little witty.** Every line could be a caption.
7. **Mobile-first, and filmed on a phone.** The work is shown on real devices, so the effect has to land on a phone screen first.
8. **Bold, saturated, single-colour grounds** taken from the brand (Coke red, Pepsi blue, HitchaRide blue).

### Watched in full (frame by frame, 18 Nov)

- **Coca-Cola (206.5K).** The hero word is **"Op[can]n."**: the 3D can *replaces the letter e* inside the headline. The site listens through the microphone for the sound of a real can being opened, and then the 3D can opens on screen. That real-world trigger is the hook of the whole video. Next comes a live counter, *"Right now, about 22,000 opened every second"*, ticking up from 4,560,951. Then Coke's dynamic ribbon line sweeps across the red. The page ends on a quiet italic **"Open One"** CTA. **The ribbon line is our torch ribbon.**
- **Pepsi (102.9K).** The can floats in front of a giant `PEPSI` wordmark, with "Shake it. Hear it." Further down, the can tilts into an **x-ray cutaway**: "Built to hold the fizz." A red marquee band reads `ICE COLD • MAXIMUM TASTE`. The object reveals what's *inside* it.
- **Porsche (84.1K).** "Porsche already have a website, so I made something they don't have yet." **The phone becomes the remote for the desktop site**: lock, unlock, lights, and a hold-to-start engine button with a live RPM readout (400 → 1,600), while the 3D car reacts on the laptop. Cross-device and tactile.
- **HitchaRide (31.9K).** "Ride together, spend smarter" → "Room for one more. Or thirty." (the vehicle swaps from sedan to SUV to bus) → "One car, 4 colleagues commuting to work." A route line **draws itself** and picks up passengers. The 3D object changes to fit the story.

**The real lesson:** each video has **one moment where the physical world touches the website** (a can sound, a phone as a key, a finger repainting a car). That moment is what gets filmed and shared. Everything else exists to set it up.

### Translating the formula to Nwokedi Legal (restraint is the luxury)

A law firm can't be a Pepsi ad. The *mechanics* carry over; the *volume* goes down to "private bank".

| buildwithmb mechanic | Nwokedi Legal translation |
|---|---|
| 3D hero object (can, car) | **The shield emblem as a real 3D object**: bevelled bronze/cream metal, with the torch flame as animated red ribbons and the gold handle catching the light. It slowly rotates in a dark navy space. |
| Particle or wireframe "engine" assembly | **The shield assembles from hairlines** (the "drafting" of a contract), then the torch *ignites*: gold light blooms from the handle and the red ribbons unfurl. "Bringing to light" made literal. |
| Giant type behind the object | **`NWOKEDI` set huge in Agatho behind the shield**, lit from below by torch-gold as the flame catches. |
| Scroll chapters | **Four chapters, one per practice.** At each, the torch light moves to "illuminate" a new practice: IP, Media & Entertainment, Corporate & Commercial, Property. Each gets one confident line. |
| Repaint the car / name on the can | **Signature interaction: "What are you protecting?"** The visitor picks or types *a song, a brand, a building, a company*. The torchlight finds the relevant practice and lights up its path. It's personal, useful and shareable. |
| Route line drawing (HitchaRide) | **A red ribbon (the flame) threads the page** as the scroll progress line. It also stands for the matter's journey from consultation to resolution. |
| Bold single-colour ground | **Midnight Navy** as the stage throughout, with cream "paper" sections as rhythm breaks. |
| Phone-first demo | Build and test on a phone first. The shield and torch moment has to be smooth on a mid-range Android, since that's the realistic Nigerian client device. |

---

## 9. Further best-in-class references to study

**Luxury / 3D scroll craft (motion benchmark)**
- **Cartier, Watches & Wonders 2026** (Immersive Garden): scrollable 3D alcoves. The gold standard for luxury WebGL restraint.
- **Hubtown**: Awwwards SOTD + Developer Award, Jun 2026. Scroll-driven Three.js.
- **IVRESS** (Japan): FWA of the Month May 2026, Awwwards SOTD. Transitions treated as scenes.
- **Iventions**: WebGL used for *atmosphere*, not spectacle. This is the closest tonal match for a law firm.
- Studios to follow: **Immersive Garden**, **Merci-Michel** ("3D used sparingly and exactly"), **Lusion**, **Noomo**.

**Law firm craft (sector benchmark: Awwwards honourable mentions and nominees)**
- **Ario Law Firm** (HM, May 2026)
- **IMK Avocats** (HM, Mar 2026)
- **Ontier** (HM, Apr 2026)
- **Kümmerlein**, Essen (2025 nominee, featured)
- **Veritas Partners** (HM, Mar 2025) · **Bélanger Paradis** (HM, Feb 2025) · **AttorneyX** (Nominee, Jun 2025)

**Gap in the market:** we found no confirmed Awwwards Site of the Day for a law firm. That's the opening. A law firm site with a genuine signature WebGL moment, executed with luxury restraint, is a portfolio piece *and* an awards submission.

Sources: [Awwwards: Ario Law Firm](https://www.awwwards.com/sites/ario-law-firm) · [Awwwards: AttorneyX](https://www.awwwards.com/sites/attorneyx) · [Awwwards: Professional Services](https://www.awwwards.com/websites/winner_category_business-services/) · [Utsubo: Best Three.js websites 2026](https://www.utsubo.com/blog/best-threejs-websites-2026) · [Hontran: Best award-winning websites 2026](https://www.hontran.dev/blog/best-award-winning-websites-2026) · [Psychoactive: WebGL agencies 2026](https://www.psychoactive.co.nz/content-hub/best-webgl-interactive-3d-agencies)

> These rankings mostly come from agency blogs, so treat them as a shortlist to study, not gospel. Each site still needs a hands-on review in the browser before we lift any idea.

---

## 10. Open questions for the client

1. **Agatho licence and webfont files.** Who holds them, Orik Creative or the client? Which weights are included?
2. **More photos** from the call-to-Bar shoot? Any office or workspace imagery?
3. **Her name and title** as they should appear (e.g. "Principal Partner"), plus the bar call year and credentials (LL.B, B.L., memberships).
4. **Office location(s)**, for the rail text and schema (e.g. `LAGOS — NIGERIA`).
5. **Notable matters or clients** she can reference, even anonymised, to back up "experienced".
6. **Domain, email and booking preference** (a consultation form, or Calendly?).
7. **Is "Property" real estate transactions, disputes, or both?**
8. **Any regulatory limits on advertising.** Nigerian RPC 2023 rules on lawyers' advertising. The copy must stay within NBA rules: no solicitation, no claims of superiority.

---

## 11. Locked decisions

| # | Decision |
|---|---|
| 1 | **Palette:** Navy `#16253D`, Cream `#E9E1CE`, Bronze `#856244`, Seal Red `#C61C23`, Torch Gold `#EDAF24` (light/logo only). Derived tokens as in §5.5. Usage ratio 60/30/7/2/1. |
| 2 | **No text in Bronze or Red on Navy.** Use `--bronze-lt #B08A64` for small text on navy. |
| 3 | **Type:** Agatho (display) + Space Grotesk (body/UI). Until the Agatho webfont arrives, **hero brand type is drawn from the official SVG wordmark paths** (pixel-true), and secondary headings use **Cormorant Garamond** as a stand-in. |
| 4 | **Logo source of truth:** `SVG/NLvariation-09…12.svg`. Never redraw the mark. |
| 5 | **Narrative device:** *Bringing to light.* Darkness → the shield draws itself → the torch ignites → the light finds each practice. |
| 6 | **Hero object:** the shield emblem as live 3D (bronze frame, cream N/L, red flame ribbons, gold handle) in front of the huge `NWOKEDI` wordmark. |
| 7 | **Four practice chapters:** Intellectual Property · Media & Entertainment · Corporate & Commercial · Property. |
| 8 | **Signature moment:** the torch follows the visitor's pointer or tilt like a lamp; "What are you protecting?" routes the light to a practice. |
| 9 | **Restraint rule:** at most one red element per viewport. Gold appears only as emitted light. |
| 10 | **Performance budget:** it has to feel smooth on a mid-range Android. DPR capped at 2, no post-processing passes that cost more than ~2 ms, and a static fallback for `prefers-reduced-motion` or no WebGL. |
