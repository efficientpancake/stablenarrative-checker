// ============================================================================
// TRAINING MODE — the run that is never written down.
//
// Origin: Mark W (ex-FCA head of supervision), meetings 2 and 3.
//
// In meeting 2 he named a behavioural hole in the decision log: "how exposed
// the initial drafter is to the immediacy of the results". If every bad first
// draft is logged against the marketer who wrote it, the rational move is to
// hide things — to under-use the checker, or to sand the copy down before
// pasting it in so the record looks clean. An audit trail that punishes honest
// first drafts produces dishonest first drafts.
//
// In meeting 3 he described the fix without naming it as one: a graduate
// trainee, told to write the most tempting promotion they can — "safe,
// guaranteed value, amazing returns, guaranteed store of value" — and shown
// what the rulebook does to it. Learning by crossing the line on purpose. He
// asked for it to be visibly a different mode: "you can even click it on, go
// training mode, and it changes the background to yellow instead of grey."
//
// So training mode is defined by its ABSENCES, not its features:
//
//   • No decision-log entry. Nothing you do here becomes an audit record.
//     There is no keep-as-is, no override, no note for sign-off — because
//     there is no promotion going anywhere and no approver to note it for.
//   • No usage-log entry. Training runs are not checks, and counting them
//     would corrupt the rounds-saved measurement with practice reps.
//   • Same engine, same rulebook, same verdicts. The lesson is only worth
//     anything if the rules are the real ones.
//
// What it ADDS is framing: the rule citation is promoted from a footnote to
// the point, and each flag is presented as a thing to understand rather than a
// thing to dispose of.
//
// Mode is deliberately NOT persisted across reloads. It always starts in Live.
// A stale training mode that someone mistook for a real check is exactly the
// failure this tool exists to prevent.
// ============================================================================

import { Severity } from "./types";

export type CheckMode = "live" | "training";

/** What each mode is called, and the one-line promise it makes. */
export const MODE_COPY: Record<CheckMode, { label: string; promise: string }> = {
  live: {
    label: "Live check",
    promise:
      "Checks real copy on its way to your s21 approver. Decisions you record here become part of the audit trail.",
  },
  training: {
    label: "Training",
    promise:
      "A safe space to learn the rules by breaking them. Nothing here is recorded, logged, or seen by anyone.",
  },
};

/** The brief shown at the top of training mode — Mark's graduate-trainee
 *  exercise, stated as an instruction rather than described as a concept. */
export const TRAINING_BRIEF = {
  title: "Write the promotion you wish you were allowed to write",
  body:
    "Go on. The hook you'd use if there were no rules: the returns, the safety, the urgency. Put it in and check it. Every breach comes back with the rule behind it and what the words actually promise a reader. This is the fastest way to learn where the line is, and nothing you write here is recorded.",
  /** Deliberately non-compliant. This is the "what not to write" exemplar Mark
   *  reached for, in the shape a crypto marketer would actually reach for. */
  example:
    "Your capital is safe with us. A guaranteed store of value, backed by real assets, with returns you can count on. Join 50,000 investors before the window closes.",
};

/** Plain-English severity, written for someone learning rather than triaging.
 *  Live mode's pills say how urgent; these say what it would cost you. */
export const SEVERITY_LESSON: Record<Severity, string> = {
  high: "This is the kind that gets a promotion pulled and the firm written to.",
  medium: "This would come back from your approver and cost you a round of edits.",
  low: "Minor, but it is still a breach, and it is still your name on the draft.",
};

/** The teaching prompt on each card. The engine already explains why something
 *  breaches; this asks the question that makes it stick — the one Mark singled
 *  out: not that you can't say "guaranteed store of value", but that saying it
 *  implies capital security.
 *
 *  The two item types need opposite questions. A flag is something you WROTE,
 *  so the lesson is what those words promise. A missing element is something
 *  you DIDN'T write, and absent words promise nothing — there the lesson is
 *  what the reader is left not knowing. */
export const IMPLICATION_PROMPT: Record<"flag" | "missing", string> = {
  flag: "What does this promise a reader who takes it at face value?",
  missing:
    "What does a reader not find out, because this isn't on the page?",
};

/** Shown where the override controls sit in live mode, so the absence reads as
 *  deliberate rather than as something that failed to load. */
export const NO_RECORD_NOTE =
  "No decision to record. Nothing in training mode is logged.";
