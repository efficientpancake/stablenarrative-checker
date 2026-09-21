// Shared types — the engine output shape defined in MVP_BUILD_SPEC.md.
// The UI is built around this shape; the real Claude call must return exactly this.

export type Severity = "high" | "medium" | "low";

export type Verdict = "non_compliant" | "compliant" | "needs_review";

export interface Flag {
  /** The exact offending text, quoted verbatim from the input. */
  quote: string;
  /** Short rule name + source doc, e.g. "Banned/caution word — COBS 4.2.5G". */
  rule: string;
  /** Plain-English explanation of why it breaches. */
  issue: string;
  severity: Severity;
  /** One-click fix: replacement for the quoted words. "" means delete them.
   *  null (or absent) means no text edit can cure it, e.g. a visual-prominence
   *  problem. See lib/fixes.ts. */
  fix?: string | null;
  /** TRAINING ONLY. What the words actually promise a reader who believes them.
   *  Mark W's distinction: the lesson isn't that you can't say "guaranteed
   *  store of value", it's that saying it implies capital security. */
  implies?: string;
}

export interface MissingElement {
  /** e.g. "Risk warning". */
  element: string;
  /** What the rule requires. */
  requirement: string;
  /** Why it's flagged as absent. */
  why: string;
  /** One-click fix: the text to add. Ignored for the risk warning, which is
   *  always inserted from the rulebook (lib/medium.ts), never from the model. */
  fix?: string | null;
  /** TRAINING ONLY. What the reader never finds out because this isn't there. */
  not_learned?: string;
}

export interface CheckResult {
  overall_verdict: Verdict;
  flags: Flag[];
  missing_required: MissingElement[];
}

// ── Rewrites (Phase 3) ──────────────────────────────────────────────────────
/** All three tones are compliant. They differ only in how much marketing
 *  voice they keep: careful is the easiest to sign off, bold the liveliest. */
export type Tone = "careful" | "balanced" | "bold";

export interface RewriteOption {
  tone: Tone;
  /** The copy itself, ready to publish in the chosen channel. */
  text: string;
  /** What must accompany it but isn't part of it, e.g. "the warning text must
   *  link to the risk summary" or "the image must carry the warning". */
  note?: string | null;
}

export interface RewriteResult {
  options: RewriteOption[];
  /** Set when no compliant version fits the channel. Mark W (31 Jul): some
   *  messages can't be made compliant within a tweet, and the tool should say
   *  so rather than hand back something that doesn't fit. */
  cannot_fit: string | null;
}
