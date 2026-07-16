// ============================================================================
// USAGE LOG — measurement for "rounds saved."
//
// One row per compliance check, so the pilot can show tangible facts about how
// the tool is actually used: who checked, when, the verdict, how many issues it
// caught, and — the headline metric — how many re-check ROUNDS a piece of copy
// took to come back clean. Each iteration a tester does in the tool is a round
// of back-and-forth the s21 approver never has to run: "rounds saved."
//
// A "session" is one piece of copy being worked: EVERY check counts as another
// round of the same session — including re-checks made after it first came back
// clean, because a marketer routinely tweaks approved copy and a tweak can break
// compliance again. Each check is always re-evaluated against the rules and
// logged; reaching clean never stops or short-circuits checking. `roundsToClean`
// is captured on the FIRST check that clears. A session ends only when the user
// explicitly starts a new piece (resetSession) — nothing auto-splits it.
//
// Local-first (this device's browser), mirroring the decision log. Export to
// CSV/JSON is how a tester hands the record back, or how the pilot pools it.
// We store COUNTS and lengths only — never the marketing copy itself — so a
// tester's unreleased campaign never leaves their machine.
// ============================================================================

import { Verdict } from "./types";
import { download } from "./decisionLog";

const STORAGE_KEY = "sn_usage_log";
const CURSOR_KEY = "sn_usage_cursor";

export interface UsageEntry {
  id: string;
  /** ISO 8601 — when the check ran. */
  timestamp: string;
  /** Access label ("user1"), or "local" when ungated (dev). Never a real name. */
  tester: string;
  /** Groups an iteration sequence (successive re-checks of one piece of copy). */
  sessionId: string;
  /** 1-based position of this check within its session. */
  round: number;
  verdict: Verdict;
  /** Number of prohibited-content flags raised. */
  flags: number;
  /** Number of missing required elements raised. */
  missing: number;
  /** True when nothing was raised — the copy is clean enough for one-pass sign-off. */
  clean: boolean;
  /** Set only on the check that first reaches clean: the round it took. */
  roundsToClean?: number;
  /** Character count of the copy checked (0 for a bare attachment) — a size
   *  signal without storing the content. */
  chars: number;
}

/** What the caller supplies; session/round/clean are derived here. */
export interface CheckFacts {
  tester: string;
  verdict: Verdict;
  flags: number;
  missing: number;
  chars: number;
}

interface Cursor {
  sessionId: string;
  round: number;
  /** Whether this session has already reached clean once — so roundsToClean is
   *  recorded on the first clear only, not every subsequent clean re-check. */
  cleared: boolean;
}

// ── Storage (client-only; guarded for SSR) ─────────────────────────────────
export function getLog(): UsageEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UsageEntry[]) : [];
  } catch {
    return [];
  }
}

function save(entries: UsageEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function readCursor(): Cursor | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CURSOR_KEY);
    return raw ? (JSON.parse(raw) as Cursor) : null;
  } catch {
    return null;
  }
}

function writeCursor(cursor: Cursor): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CURSOR_KEY, JSON.stringify(cursor));
}

function newId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

/**
 * Record one check. Continues the current session at round + 1 (or starts one
 * at round 1 if none is active). A clean result does NOT close the session —
 * only resetSession() does — so post-clean tweaks stay part of the same piece.
 * roundsToClean is stamped on the first clear only. Returns the updated log.
 */
export function recordCheck(facts: CheckFacts): UsageEntry[] {
  const clean = facts.flags === 0 && facts.missing === 0;
  const cursor = readCursor();

  const sessionId = cursor ? cursor.sessionId : newId();
  const round = cursor ? cursor.round + 1 : 1;
  const alreadyCleared = cursor ? cursor.cleared : false;
  const firstClear = clean && !alreadyCleared;

  const entry: UsageEntry = {
    id: newId(),
    timestamp: new Date().toISOString(),
    tester: facts.tester,
    sessionId,
    round,
    verdict: facts.verdict,
    flags: facts.flags,
    missing: facts.missing,
    clean,
    roundsToClean: firstClear ? round : undefined,
    chars: facts.chars,
  };

  const entries = getLog();
  entries.unshift(entry);
  save(entries);
  writeCursor({ sessionId, round, cleared: alreadyCleared || clean });
  return entries;
}

/** End the current session so the next check starts a fresh piece at round 1.
 *  Call when the marketer explicitly starts new copy. */
export function resetSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CURSOR_KEY);
}

export function clearLog(): UsageEntry[] {
  save([]);
  resetSession();
  return [];
}

// ── Summary — the "rounds saved" headline ──────────────────────────────────
export interface UsageSummary {
  totalChecks: number;
  sessions: number;
  /** Sessions that reached clean copy. */
  sessionsCleared: number;
  /** Iterations absorbed before sign-off = every check past the first in a
   *  session. This is the count of approver rounds the tool stood in for. */
  roundsSaved: number;
  /** Mean rounds to reach clean, over cleared sessions (null if none yet). */
  avgRoundsToClean: number | null;
  flagsCaught: number;
  missingCaught: number;
  testers: number;
}

export function summarize(entries: UsageEntry[]): UsageSummary {
  const sessions = new Map<string, UsageEntry[]>();
  for (const e of entries) {
    const arr = sessions.get(e.sessionId);
    if (arr) arr.push(e);
    else sessions.set(e.sessionId, [e]);
  }

  const cleared: number[] = [];
  for (const arr of sessions.values()) {
    const done = arr.find((e) => e.roundsToClean != null);
    if (done?.roundsToClean != null) cleared.push(done.roundsToClean);
  }

  const testers = new Set(entries.map((e) => e.tester));
  const flagsCaught = entries.reduce((n, e) => n + e.flags, 0);
  const missingCaught = entries.reduce((n, e) => n + e.missing, 0);
  const avg =
    cleared.length > 0
      ? cleared.reduce((n, r) => n + r, 0) / cleared.length
      : null;

  return {
    totalChecks: entries.length,
    sessions: sessions.size,
    sessionsCleared: cleared.length,
    roundsSaved: entries.length - sessions.size,
    avgRoundsToClean: avg,
    flagsCaught,
    missingCaught,
    testers: testers.size,
  };
}

// ── Export ─────────────────────────────────────────────────────────────────
const CSV_COLUMNS: { key: keyof UsageEntry; label: string }[] = [
  { key: "timestamp", label: "Timestamp (UTC)" },
  { key: "tester", label: "Tester" },
  { key: "sessionId", label: "Session" },
  { key: "round", label: "Round" },
  { key: "verdict", label: "Verdict" },
  { key: "flags", label: "Flags" },
  { key: "missing", label: "Missing elements" },
  { key: "clean", label: "Clean" },
  { key: "roundsToClean", label: "Rounds to clean" },
  { key: "chars", label: "Characters" },
  { key: "id", label: "Record ID" },
];

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCSV(entries: UsageEntry[]): string {
  const header = CSV_COLUMNS.map((c) => csvCell(c.label)).join(",");
  const rows = entries.map((e) =>
    CSV_COLUMNS.map((c) => csvCell(e[c.key])).join(",")
  );
  return [header, ...rows].join("\r\n");
}

export function toJSON(entries: UsageEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function exportCSV(entries: UsageEntry[]): void {
  download(`usage-log-${stamp()}.csv`, toCSV(entries), "text/csv;charset=utf-8");
}
export function exportJSON(entries: UsageEntry[]): void {
  download(`usage-log-${stamp()}.json`, toJSON(entries), "application/json");
}

/** Human-readable local timestamp for on-screen display. */
export function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
