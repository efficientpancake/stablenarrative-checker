// ============================================================================
// ONE-CLICK FIXES: apply a suggested edit to the marketer's own draft.
//
// Rohan's feedback asked for a "one-click-fix solution". A fix only ever edits
// the draft in the copy box; the draft is then checked again and still goes to
// the human s21 approver. There is deliberately no one-click way to accept a
// risk: that stays a reasoned, recorded decision (see decisionLog.ts).
//
// A missing risk warning is never filled with model-written text. The app
// inserts the exact prescribed wording for the chosen channel from its own
// rulebook (medium.ts), so the warning is always verbatim.
// ============================================================================

import { Medium, warningText } from "./medium";

export function isRiskWarning(element: string): boolean {
  return /risk warning/i.test(element);
}

/** Where the quoted words sit in the draft: an exact match first, then a
 *  case-insensitive one. Null when the words are no longer in the draft (an
 *  earlier fix or a manual edit already changed them). */
function locate(draft: string, quote: string): number | null {
  if (!quote) return null;
  const exact = draft.indexOf(quote);
  if (exact !== -1) return exact;
  const loose = draft.toLowerCase().indexOf(quote.toLowerCase());
  return loose === -1 ? null : loose;
}

export function canApplyFlagFix(draft: string, quote: string): boolean {
  return locate(draft, quote) !== null;
}

/** Deleting words can leave doubled spaces or a space before punctuation. */
function tidy(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([.,!?;:])/g, "$1")
    .replace(/([.!?])\s*\1+/g, "$1")
    .replace(/^[ \t]+/gm, "")
    .trim();
}

/** Swap the flagged words for the suggestion ("" deletes them). Returns null
 *  if the words can't be found in the draft. */
export function applyFlagFix(draft: string, quote: string, fix: string): string | null {
  const at = locate(draft, quote);
  if (at === null) return null;
  const next = draft.slice(0, at) + fix + draft.slice(at + quote.length);
  return fix === "" ? tidy(next) : next;
}

/** The text a missing-element fix adds. The risk warning comes from the
 *  rulebook for this channel; anything else uses the checker's suggestion. */
export function missingFixText(
  element: string,
  fix: string | null | undefined,
  medium: Medium
): string | null {
  if (isRiskWarning(element)) return warningText(medium);
  return fix && fix.trim() ? fix.trim() : null;
}

/** Add a missing element: the risk warning goes first (the rules want it
 *  leading), anything else goes at the end. */
export function applyMissingFix(draft: string, element: string, text: string): string {
  const body = draft.trim();
  return isRiskWarning(element) ? `${text}\n\n${body}` : `${body}\n\n${text}`;
}
