// ============================================================================
// MEDIUM: where the copy is going, and what that changes about the warning.
//
// Ported from the training-mode branch (feature/training-mode) for the live
// checker's rewrites and one-click fixes. The rewrite was pulled from the MVP
// once (cd40058) because it returned copy that didn't fit its medium: ~1000
// characters back for a 200-character post (Rohan's feedback). The cause was
// never length arithmetic: the rewriter didn't know what it was writing for.
//
// The FCA rules are themselves medium-dependent, so "what medium" is a
// compliance question before it is a formatting one. From the handbook text in
// /FCA Rules, verified rather than recalled:
//
//   • COBS 4.12A(2)(a): where the full warning "exceeds the number of
//     characters permitted by a third-party marketing provider", the SHORT
//     warning applies for qualifying cryptoassets and is the ENTIRE warning:
//     "Don't invest unless you're prepared to lose all the money you invest."
//   • COBS 4.12A(3)(a): in a digital medium the warning must also include the
//     link text "Take 2 mins to learn more", delivering the COBS 4 Annex 1R
//     risk summary in a pop-up.
//   • PS23/6 Table 2: "Take 2 mins" is required in digital media unless the
//     character limit or the medium prevents it; in non-digital media it is not
//     required, and the risk summary goes in a durable medium instead.
//   • PS23/6 3.8: in a durable medium the risk summary is displayed with the
//     promotion, "legible, and not hidden within other forms of disclosure".
//
// The channel reaches the CHECK too, not only the rewrite: otherwise a tweet
// carrying the (correct) short warning would be flagged for lacking the full
// one, and a marketer applying our own fix would loop.
// ============================================================================

import { PRESCRIBED_RISK_WARNING } from "./ruleset";

export type MediumId = "web" | "social_text" | "social_visual" | "email" | "print";

/** Which form of the prescribed warning the channel takes. */
export type WarningForm = "full-link" | "full" | "short" | "on-image";

export interface Medium {
  id: MediumId;
  /** What the user picks. */
  label: string;
  /** How it reads mid-sentence ("rewrites for a text post"). Kept separate
   *  from the label so lowercasing never turns "X" into "x". */
  noun: string;
  /** One line under the picker saying why the choice matters. */
  note: string;
  warning: WarningForm;
  /** Hard character limit for the copy, where the platform imposes one. */
  maxChars?: number;
  /** Told to the checker, so it judges the warning for this channel. */
  checkContext: string;
  /** Told to the rewriter: which warning, where, and how long. */
  directive: string;
}

export const SHORT_RISK_WARNING =
  "Don't invest unless you're prepared to lose all the money you invest.";

export const MEDIA: Medium[] = [
  {
    id: "web",
    label: "Web or landing page",
    noun: "web or landing page",
    note: "Full risk warning with the \"Take 2 mins to learn more\" link, fixed at the top of the page.",
    warning: "full-link",
    checkContext:
      "a web or landing page (digital). The full prescribed warning with \"Take 2 mins to learn more\" is required.",
    directive:
      'Lead with the FULL prescribed warning, ending "Take 2 mins to learn more." Normal marketing length is fine. In each option\'s note, say the warning must sit statically fixed at the top of the page (COBS 4.12A; PS23/6 Table 2).',
  },
  {
    id: "social_text",
    label: "Text post (X, etc.)",
    noun: "text post",
    note: "Limited to 280 characters by the platform, so the short prescribed warning applies.",
    warning: "short",
    maxChars: 280,
    checkContext:
      "a text post on a character-limited third-party platform (for example X). Under COBS 4.12A(2)(a) the SHORT prescribed warning \"Don't invest unless you're prepared to lose all the money you invest.\" is the entire required warning here, and \"Take 2 mins to learn more\" may be omitted. Do NOT flag the full warning as missing if the short warning is present verbatim.",
    directive:
      'This channel is character-limited by a third-party platform, so COBS 4.12A(2)(a) applies: use ONLY the short prescribed warning, verbatim and complete: "Don\'t invest unless you\'re prepared to lose all the money you invest." Do NOT add the "high-risk investment" clause or "Take 2 mins to learn more". Because that link is omitted, PS23/6 Table 2 requires the risk summary to be linked from the warning text itself: say so in the note, NOT in the text. HARD LIMIT: each option\'s text, warning included, must be 280 characters or fewer. The warning alone is 68 characters, leaving about 210. Cut marketing claims to fit.',
  },
  {
    id: "social_visual",
    label: "Social post with an image",
    noun: "social post with an image",
    note: "The warning can sit on the image, but it must be genuinely prominent.",
    warning: "on-image",
    checkContext:
      "a social post with an attached image. The prescribed warning may be carried on the image rather than in the caption; if the caption alone is being checked, do not flag the warning as missing from the caption, but do list it as missing only if nothing indicates it appears on the image.",
    directive:
      "A social post with an attached image. The warning may be carried ON the image instead of the caption, but it must be prominent, legible and contained in its own border (PS23/6 Table 2; COBS 4.12A.11R). Write only the caption as the text and keep it short. In the note, state exactly what the image must carry.",
  },
  {
    id: "email",
    label: "Email",
    noun: "email",
    note: "Digital, so the full warning and the \"Take 2 mins to learn more\" link both apply.",
    warning: "full-link",
    checkContext:
      "an email (digital). The full prescribed warning with \"Take 2 mins to learn more\" is required.",
    directive:
      'Lead with the FULL prescribed warning, ending "Take 2 mins to learn more", placed before the body copy. Normal email length is fine.',
  },
  {
    id: "print",
    label: "Print or non-digital",
    noun: "printed promotion",
    note: "No link in print, so no \"Take 2 mins\". The risk summary goes alongside the promotion instead.",
    warning: "full",
    checkContext:
      "a printed, non-digital promotion. The full prescribed warning is required but \"Take 2 mins to learn more\" is NOT (there is nothing to link to, PS23/6 Table 2); the risk summary must be displayed alongside the promotion.",
    directive:
      'This is a NON-DIGITAL channel, the one case where the risk summary belongs with the promotion. (1) Per PS23/6 Table 2, "Take 2 mins to learn more" is NOT included: use the full prescribed warning without that sentence. (2) The risk summary must be "prominently displayed alongside other information in the promotion" (PS23/6 3.8), so include it as a clearly separated, labelled block after the marketing copy, drawn from the COBS 4 Annex 1R template. (3) The same rule requires it be "legible, and not hidden within other forms of disclosure": the marketing body copy must contain ZERO mentions of FSCS, the Financial Ombudsman Service, "largely unregulated", or "value can go down as well as up". Those appear only in the warning at the top and the labelled risk-summary block at the bottom.',
  },
];

export const DEFAULT_MEDIUM: MediumId = "web";

export function getMedium(id: string | undefined | null): Medium {
  return MEDIA.find((m) => m.id === id) ?? MEDIA.find((m) => m.id === DEFAULT_MEDIUM)!;
}

/** The exact prescribed warning this channel takes. Used verbatim by the
 *  one-click fix for a missing risk warning, so the wording never comes from
 *  the model. */
export function warningText(m: Medium): string {
  switch (m.warning) {
    case "full-link":
      return `${PRESCRIBED_RISK_WARNING} Take 2 mins to learn more.`;
    case "full":
      return PRESCRIBED_RISK_WARNING;
    case "short":
    case "on-image":
      return SHORT_RISK_WARNING;
  }
}
