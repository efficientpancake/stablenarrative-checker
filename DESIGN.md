# Design System: StableNarrative

## Accessibility first (hard rule)

Every screen must be readable by dyslexic readers. This is a requirement, not a
style preference. It follows the British Dyslexia Association
[Dyslexia Style Guide 2023](https://cdn.bdadyslexia.org.uk/uploads/documents/Advice/style-guide/BDA-Style-Guide-2023.pdf):

- **One sans-serif typeface.** No serif, script or monospace fonts.
- **No italics. No underlining. No all-caps text.** Use bold for emphasis.
- **Body text 16 to 18px**, nothing under 14px anywhere. Line spacing 1.5.
- **Left-aligned** text. Never justified, never centered blocks of copy.
- **Dark text on a soft, non-white background** (a pale tint, not #FFFFFF).
- **Headings at least 20% larger** than body text.
- **Links** look different from body text: purple and semibold (not underlined).
- **Contrast**: every text/background pair at least 4.5:1, in light and dark.

Before proposing any font, color or format change, check it against this list.

## Product context

- **What this is:** an FCA compliance pre-check for UK crypto marketing copy.
  Marketers paste copy and see every rule it breaks before it goes to their
  s21 approver, who always signs off.
- **Who it's for:** marketers at UK crypto firms (primary) and their s21
  approvers (secondary).
- **Project type:** a web app (the checker at /app) with a landing page at /.
- **The feeling:** fast and effortless ("paste, check, done"), warm and calm,
  a tool with a voice. Never loud, never aggressive, never "AI-built".

## Aesthetic direction

- **Direction:** "Soft". Calm, spacious, pale lavender, her purple used sparingly.
- **Decoration:** minimal. Typography and spacing do the work.
- **References she chose:** Linear (restraint), Stampede and Nazr (confident
  headlines, one accent color, neutral backgrounds).
- **Rejected on 18 Sept 2026 (do not revisit without asking):** editorial serif
  headlines (Newsreader), a blue/paper palette, extra-bold 800-weight headlines,
  all-caps labels, italic emphasis, wavy underlines. She called these
  "vibe coded", "ugly and aggressive", and unreadable for dyslexic people.

## Typography

- **Typeface:** Inter, the official build (inter-ui 4.1.1, OFL), self-hosted at
  `app/fonts/InterVariable.woff2` and loaded in `app/layout.tsx`.
  Do NOT use Google Fonts' Inter: it strips the letter alternates below.
- **Letter alternates, always on:** `font-feature-settings: "cv05", "cv08"`.
  cv08 gives capital I crossbars, cv05 gives lowercase l a tail, so I, l and 1
  never look alike. Rule citations also use `"tnum"` (and `"zero"` where a
  slashed zero helps).
- **Weights:** 400 body, 500 headlines and medium labels, 600 buttons and
  emphasis. Nothing heavier than 700.
- **Scale:**
  - Landing headline: clamp(2rem, 3.6vw, 2.6rem), weight 500, line height 1.22
  - Page title (checker): 34px / 27px on phones, weight 500
  - Section heading: 18 to 26px, weight 600 (checker); landing section
    headings 26px bold (700)
  - Body: 17px (landing lede 18px), line height 1.5
  - Small text (meta, hints, tags): 14 to 15.5px, never below 14px
- **Keep phrases together:** where a phrase must not break (the landing
  headline's "before your approver does."), wrap it in an inline-block span.

## Color

- **Approach:** restrained. Her purple plus soft neutrals. Status colors only
  ever mean breach, caution or clean.
- **Purple (brand):** `#7C3AED` fills buttons and the logo mark.
  `#6D2FDB` for purple text on lavender (readability). Soft tint `#ECE6FD`.
- **Light (default):**
  | Token | Hex | Use |
  |---|---|---|
  | --bg-page | #F4F2FB | Page background (pale lavender) |
  | --bg-card | #FCFBFF | Cards and panels |
  | --bg-input | #F7F5FD | Inputs, quotes |
  | --border-default | #E4E0F2 | Borders |
  | --border-strong | #D3CDE8 | Input and control borders |
  | --text-primary | #24222C | Text (14.1:1) |
  | --text-secondary | #5B5868 | Helper text (6.2:1) |
- **Status (light):** breach `#B3261E` on `#FBE7E4` (5.5:1), caution `#8A5300`
  on `#FBEFD9` (5.6:1), clean `#1F7348` on `#E1F2E8`.
- **Dark (only when chosen with the toggle):** soft purple-tinted charcoal
  `#1E1D23`, cards `#26252D`, text `#ECEAF2`, helper text `#AAA6B6`, purple text
  `#C4B2FA`. Buttons stay `#7C3AED` with white text (5.7:1).
- All values live in `app/globals.css` (checker, support) and
  `app/landing.module.css` (landing). Change them there, then update this table.

## Spacing and shape

- **Base unit:** 4px. Comfortable density: roomy on the landing page, tighter
  in the checker so results scan fast.
- **Radius:** controls and buttons 10px, cards 12px, panels 14px, severity tags
  6px. No pill-shaped buttons.
- **Max content width:** 1060px. Reading width about 34 to 44em.

## Components

- **Primary button:** flat `#7C3AED`, white text, weight 600, 10px radius.
  Hover `#6D2FDB`. No gradients, glows or lift on hover.
- **Secondary button:** card background, 1px strong border, text color.
- **Flagged words in results:** bold with a soft highlight in the severity
  color (`.flagged-high`, `.flagged-medium`, `.flagged-low`). Never underlined.
- **Severity tags:** sentence case ("High", "Missing"), never all-caps.
- **Results grouping:** "Fix before sign-off" (high, missing, medium) and
  "Worth a look" (low), following the checker's own verdict rule.

## Motion

- **Approach:** minimal and functional. Quick color transitions (150ms) only.
- The loading spinner is the one animation kept. No pulsing, sliding,
  lifting or entrance animations.

## Decisions log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-09-18 | Dyslexia accessibility made a hard rule | Founder requirement; BDA Style Guide 2023 |
| 2026-09-18 | "Soft" direction: pale lavender, calm, left-aligned | Chosen from five hero options (option A) |
| 2026-09-18 | Inter (official build) with cv05 + cv08 | Chosen from eight fonts as "more closed and secure" than Open Sans; alternates keep I, l, 1 distinct |
| 2026-09-18 | Keep her purple #7C3AED | Founder preference; Linear also uses purple |
| 2026-09-18 | Rejected serif "proofing desk" and heavy bold directions | Founder: unreadable for dyslexic readers, "vibe coded", "aggressive" |
| 2026-09-19 | Landing headline: Inter 500, break after "in"; purple "before your approver does." in Inter 600 | Chosen from six headline options; tried Arial first but it looked the same as Inter |
