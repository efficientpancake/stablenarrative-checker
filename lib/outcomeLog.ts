// ============================================================================
// OUTCOME LOG: what the approver actually did with each piece of copy.
//
// Origin: Rob (10 Sep). Testers get the checker free while it is calibrated;
// the one thing asked in return is "was it approved?". Rounds saved says how
// many drafts the tool absorbed. This says whether the draft that finally went
// to sign-off got through, which is the claim the product actually makes:
// copy that clears the checker should clear the approver in one pass.
//
// ── Shape of the problem ────────────────────────────────────────────────────
// The unit is a PIECE of copy: one usage-log session, across all its rounds.
// Its outcome arrives days later, because testers batch a month of campaign
// copy and send it for sign-off together. So the question cannot be asked at
// check time. A piece stays pending on this device until the tester answers.
//
// ── What leaves the device, and what does not ───────────────────────────────
// Answers are sent through Netlify Forms (see public/__forms.html), the same
// channel the support form already uses, so they land in the Netlify dashboard
// rather than in a log that ages out. A submission carries the outcome and the
// piece's counts (rounds, whether it reached clean). It NEVER carries the
// marketing copy, matching the usage log's rule.
//
//   • `label` is a short preview of the copy so a tester can recognize the
//     piece a week later. It is stored on this device only: never submitted,
//     never exported.
//   • `feedback` is sent, but only when the tester chooses to paste their
//     approver's comments under a label that says it is sent.
//
// If sending fails (offline, or local dev where Netlify Forms does not exist),
// the answer is kept here with sent unset and retried on the next page load.
// An answer is never lost just because the network was.
// ============================================================================

import type { UsageEntry } from "./usageLog";

const STORAGE_KEY = "sn_outcomes";

export type Outcome = "approved_first_time" | "sent_back" | "not_sent";

/** Wording shown on the buttons AND sent to Netlify, so the dashboard reads in
 *  the same words the tester clicked. */
export const OUTCOME_LABEL: Record<Outcome, string> = {
  approved_first_time: "Approved first time",
  sent_back: "Sent back with changes",
  not_sent: "Didn't send it",
};

export interface PieceRecord {
  /** The usage-log session this piece is. */
  sessionId: string;
  /** LOCAL ONLY. A one-line preview of the copy. Never sent, never exported. */
  label: string;
  /** ISO 8601, first check of the piece. */
  firstChecked: string;
  outcome?: Outcome;
  /** Approver comments the tester chose to paste. Only ever on sent_back. */
  feedback?: string;
  /** ISO 8601, when the tester answered. */
  answeredAt?: string;
  /** True once Netlify accepted the submission. "Didn't send it" is never
   *  submitted, so it never sets this. */
  sent?: boolean;
}

// ── Storage (client-only; guarded for SSR) ─────────────────────────────────
export function getPieces(): PieceRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PieceRecord[]) : [];
  } catch {
    return [];
  }
}

function save(pieces: PieceRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pieces));
  } catch {
    /* storage blocked or full: the check itself must still work */
  }
}

/** Collapse whitespace and cut to one readable line. */
function preview(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > 80 ? `${oneLine.slice(0, 79)}…` : oneLine;
}

/** Note that a piece exists, the first time it is checked. Later rounds of the
 *  same piece leave the original label alone, so the preview a tester sees is
 *  the one they started with. */
export function rememberPiece(sessionId: string, text: string): void {
  const pieces = getPieces();
  if (pieces.some((p) => p.sessionId === sessionId)) return;
  pieces.unshift({
    sessionId,
    label: preview(text) || "Untitled piece",
    firstChecked: new Date().toISOString(),
  });
  save(pieces);
}

// ── Facts about a piece, derived from the usage log ────────────────────────
export interface PieceFacts {
  rounds: number;
  reachedClean: boolean;
  roundsToClean: number | null;
  lastChecked: string;
}

/** Null when the usage log no longer holds the piece (a tester can clear it). */
export function factsFor(sessionId: string, usage: UsageEntry[]): PieceFacts | null {
  const checks = usage.filter((e) => e.sessionId === sessionId);
  if (checks.length === 0) return null;
  const cleared = checks.find((e) => e.roundsToClean != null);
  const lastChecked = checks.reduce(
    (latest, e) => (e.timestamp > latest ? e.timestamp : latest),
    checks[0].timestamp
  );
  return {
    rounds: checks.length,
    reachedClean: checks.some((e) => e.clean),
    roundsToClean: cleared?.roundsToClean ?? null,
    lastChecked,
  };
}

export type PendingPiece = PieceRecord & { facts: PieceFacts };

/** Pieces still waiting for an answer, newest first. The piece currently on
 *  screen is excluded: it is still being worked, so it hasn't been sent yet. */
export function pendingPieces(
  pieces: PieceRecord[],
  usage: UsageEntry[],
  activeSessionId: string | null
): PendingPiece[] {
  const pending: PendingPiece[] = [];
  for (const p of pieces) {
    if (p.outcome || p.sessionId === activeSessionId) continue;
    const facts = factsFor(p.sessionId, usage);
    if (facts) pending.push({ ...p, facts });
  }
  return pending.sort((a, b) => b.facts.lastChecked.localeCompare(a.facts.lastChecked));
}

// ── Answering ──────────────────────────────────────────────────────────────
export function setOutcome(
  sessionId: string,
  outcome: Outcome,
  feedback?: string
): PieceRecord[] {
  const pieces = getPieces().map((p) =>
    p.sessionId === sessionId
      ? {
          ...p,
          outcome,
          feedback: outcome === "sent_back" && feedback ? feedback : undefined,
          answeredAt: new Date().toISOString(),
        }
      : p
  );
  save(pieces);
  return pieces;
}

export function markSent(sessionId: string): PieceRecord[] {
  const pieces = getPieces().map((p) =>
    p.sessionId === sessionId ? { ...p, sent: true } : p
  );
  save(pieces);
  return pieces;
}

/** Answers that still need to reach Netlify. */
export function unsentAnswers(pieces: PieceRecord[]): PieceRecord[] {
  return pieces.filter((p) => p.outcome && p.outcome !== "not_sent" && !p.sent);
}

/** POST one answer to Netlify Forms. Resolves true only when Netlify accepted
 *  it. Every field here must exist, by the same name, on the "outcome" form in
 *  public/__forms.html, or Netlify silently drops it. */
export async function submitOutcome(
  piece: PieceRecord,
  facts: PieceFacts | null,
  tester: string
): Promise<boolean> {
  if (!piece.outcome || piece.outcome === "not_sent") return false;
  const body = new URLSearchParams({
    "form-name": "outcome",
    "bot-field": "",
    tester,
    session: piece.sessionId,
    outcome: OUTCOME_LABEL[piece.outcome],
    rounds: facts ? String(facts.rounds) : "",
    reached_clean: facts ? (facts.reachedClean ? "yes" : "no") : "",
    rounds_to_clean: facts?.roundsToClean != null ? String(facts.roundsToClean) : "",
    feedback: piece.feedback ?? "",
    first_checked: piece.firstChecked,
    answered_at: piece.answeredAt ?? new Date().toISOString(),
    build: process.env.NEXT_PUBLIC_BUILD ?? "dev",
  });
  try {
    const res = await fetch("/__forms.html", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Summary for the usage panel ────────────────────────────────────────────
export interface OutcomeSummary {
  /** Pieces that went to an approver and came back with an answer. */
  answered: number;
  approvedFirstTime: number;
}

export function summarizeOutcomes(pieces: PieceRecord[]): OutcomeSummary {
  const answered = pieces.filter(
    (p) => p.outcome === "approved_first_time" || p.outcome === "sent_back"
  );
  return {
    answered: answered.length,
    approvedFirstTime: answered.filter((p) => p.outcome === "approved_first_time").length,
  };
}
