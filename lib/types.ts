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
}

export interface MissingElement {
  /** e.g. "Risk warning". */
  element: string;
  /** What the rule requires. */
  requirement: string;
  /** Why it's flagged as absent. */
  why: string;
}

export interface CheckResult {
  overall_verdict: Verdict;
  flags: Flag[];
  missing_required: MissingElement[];
  /** The cleaned-up, compliant version of the whole input. */
  compliant_rewrite: string;
}
