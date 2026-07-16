// ============================================================================
// DECISION LOG — the FCA audit trail.
//
// When the checker flags something and the human approver decides to OVERRIDE
// it (accept the risk), that decision is recorded here with WHO decided, WHEN,
// and WHY. This is the "record of why it is satisfied the promotion complies"
// that COBS 4.11.2G says a firm should keep — and the contemporaneous, reasoned
// record COBS 4.11.1R / 4.10 expect for an approval decision.
//
// Grounded in (see /FCA Rules):
//   • COBS 4.11.1R(1)  — must make an adequate record of any promotion approved
//   • COBS 4.11.2G     — should record WHY it's satisfied the promotion complies
//   • COBS 4.5.2R      — approved promotion carries WHO approved it and WHEN
//   • COBS 4.11.1R(3)  — retain 3 years (crypto = "any other case")
//
// Storage is local-first (this device's browser). Export to CSV/JSON is what
// makes the record portable and lets a firm "produce it quickly and reliably".
// ============================================================================

const STORAGE_KEY = "sn_decision_log";

/** Dropdown categories — the approver's track record. Edit freely; seeded from
 *  the compliance-mentor's language and the real-world limitations users hit. */
export const OVERRIDE_REASONS = [
  "Overcautious — flag doesn't meet the regulatory objective here",
  "Requirement satisfied elsewhere (link / visual / landing page)",
  "Rule not engaged in this context (e.g. not a financial promotion)",
  "Risk understood and accepted (documented residual risk)",
] as const;

export type OverrideReason = (typeof OVERRIDE_REASONS)[number];

export interface DecisionLogEntry {
  id: string;
  /** ISO 8601 — contemporaneous timestamp of the override decision. */
  timestamp: string;
  itemType: "flag" | "missing";
  /** Stable identifier for the flagged item (so the UI can show accepted state). */
  itemKey: string;
  /** The rule or required element cited by the checker. */
  rule: string;
  /** The offending quote (flag) or the requirement (missing element). */
  quote: string;
  /** What the checker raised — the issue text. */
  issue: string;
  severity?: string;
  /** Dropdown category. */
  reason: string;
  /** Free-text justification — the load-bearing "why" (COBS 4.11.2G). */
  justification: string;
  /** Who made the call — name or initials (COBS 4.5.2R accountability). */
  approver: string;
  /** The promotion this decision relates to, so the record is self-contained. */
  promotion: string;
}

/** Stable key for a flagged item — mirrors the engine's dedup key shape. */
export function flagKey(rule: string, quote: string): string {
  return `flag|${rule}|${quote}`;
}
export function missingKey(element: string): string {
  return `missing|${element}`;
}

// ── Storage (client-only; guarded for SSR) ─────────────────────────────────
export function getLog(): DecisionLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DecisionLogEntry[]) : [];
  } catch {
    return [];
  }
}

function save(entries: DecisionLogEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function newId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

/** Append an override decision. Returns the full, updated log. */
export function addEntry(
  entry: Omit<DecisionLogEntry, "id" | "timestamp">
): DecisionLogEntry[] {
  const entries = getLog();
  entries.unshift({ ...entry, id: newId(), timestamp: new Date().toISOString() });
  save(entries);
  return entries;
}

export function removeEntry(id: string): DecisionLogEntry[] {
  const entries = getLog().filter((e) => e.id !== id);
  save(entries);
  return entries;
}

export function clearLog(): DecisionLogEntry[] {
  save([]);
  return [];
}

// ── Export ─────────────────────────────────────────────────────────────────
const CSV_COLUMNS: { key: keyof DecisionLogEntry; label: string }[] = [
  { key: "timestamp", label: "Timestamp (UTC)" },
  { key: "approver", label: "Approver" },
  { key: "itemType", label: "Type" },
  { key: "rule", label: "Rule / element" },
  { key: "quote", label: "Flagged text / requirement" },
  { key: "issue", label: "Issue raised" },
  { key: "severity", label: "Severity" },
  { key: "reason", label: "Override reason" },
  { key: "justification", label: "Justification" },
  { key: "promotion", label: "Promotion" },
  { key: "id", label: "Record ID" },
];

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  // Quote-wrap and double any embedded quotes so commas/newlines are safe.
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCSV(entries: DecisionLogEntry[]): string {
  const header = CSV_COLUMNS.map((c) => csvCell(c.label)).join(",");
  const rows = entries.map((e) =>
    CSV_COLUMNS.map((c) => csvCell(e[c.key])).join(",")
  );
  return [header, ...rows].join("\r\n");
}

export function toJSON(entries: DecisionLogEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

/** Trigger a browser download of `content` as `filename`. */
export function download(filename: string, content: string, mime: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** yyyy-mm-dd for filenames, from an ISO string (or now). */
function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function exportCSV(entries: DecisionLogEntry[]): void {
  download(`decision-log-${stamp()}.csv`, toCSV(entries), "text/csv;charset=utf-8");
}
export function exportJSON(entries: DecisionLogEntry[]): void {
  download(`decision-log-${stamp()}.json`, toJSON(entries), "application/json");
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
