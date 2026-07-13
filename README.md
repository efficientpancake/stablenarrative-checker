# StableNarrative — FCA Compliance Checker (MVP)

Grammarly, but for UK FCA financial-promotion compliance. Paste crypto marketing
copy → get back prohibited-content flags, missing required elements, and a
compliant rewrite. The tool pre-cleans copy so the human s21 approver signs off
in one pass. **The human approver always stays.**

Built to the locked spec in `../MVP_BUILD_SPEC.md`.

## Run it

```
cd checker-app
npm install
npm run dev
```

Open http://localhost:3000. Click **Load example**, then **Check compliance**.
No API key needed — the engine is stubbed.

## Architecture (approach A: one structured Claude call)

```
[paste box] → /api/check → runCheck() → structured JSON → results panel
```

- `lib/types.ts` — the engine output shape (the UI is built around this).
- `lib/ruleset.ts` — **the moat.** The curated, hardcoded system prompt +
  banned-words list, drawn from COBS 4, the FCA cryptoasset financial-promotion
  rules & finalised guidance, GEN 4, PRIN 2A, and the MiCA marketing-guidelines
  doc. No "upload your own rules" — the ruleset is curated, not user-supplied.
- `lib/engine.ts` — **the one swap point.** `runCheck()` is all the app calls.
  Today it runs a local heuristic `stubEngine`; `callClaude` is already written
  against the real Messages API.

## Going live (the one-place swap)

1. `cp .env.local.example .env.local` and add your `ANTHROPIC_API_KEY`.
2. In `lib/engine.ts`, set `USE_STUB = false`.

That's the whole swap. `callClaude` sends the input + `SYSTEM_PROMPT` in one
structured call and parses the JSON — no other file changes.

## What the stub does (and doesn't)

The stub is a deterministic keyword/pattern scan — banned words, urgency/FOMO,
cashback incentives, superlatives, and a risk-warning presence check — so the
shell demos end-to-end on any pasted copy. It is **not** the compliance brain:
it can't reason about context, balance, or consumer-impression the way the real
Claude call (driven by `ruleset.ts`) does. Don't measure accuracy against the
golden set until the real engine is switched on.

## Scope (from the spec)

**In:** paste box, one structured check, prohibited-content flags, missing
required elements, compliant rewrite, baked-in ruleset.

**Out (v2 / slides):** tone-of-voice onboarding, website/compliance scanner
(that's Super Sarah), browser plugin, "upload your own rules", prominence
judgment (v1 is binary present/absent). s21 / perimeter / firm-registration
flags are out of scope — this checker judges **copy**, not firm status.

Compliance-style review to assist a human approver — not legal advice.
