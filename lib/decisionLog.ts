// ============================================================================
// DECISION LOG — the record of every checker flag a human chose to keep.
//
// Two very different people can make that call, and the record must not blur
// them, because the FCA weighting is opposite in each case:
//
//   • AUTHOR (the marketer, and the default user of this tool). They do NOT
//     approve promotions — only an authorised s21 approver can. When an author
//     keeps flagged copy, they are writing a NOTE that travels WITH the copy to
//     sign-off: "here's why I think this is fine — over to you." It discharges
//     no COBS obligation and is not an approval record. Framing it as "risk
//     accepted" would invite the author to perform an approver-only act, and a
//     log of "risk accepted" lines is an exhibit of documented recklessness if
//     the FCA ever reads it.
//
//   • APPROVER (enterprise deployments whose users ARE the s21 approver). Their
//     override IS the approval decision, and its record is the one COBS 4.11
//     expects. The old approval-record language is correct — but ONLY here.
//
// The `role` on each entry keeps these apart. Copy, reason lists, and the COBS
// grounding below all key off it. This is deliberately not a global rename to
// "author": the approver semantics are load-bearing the moment enterprise lands.
//
// COBS grounding — applies to APPROVER-role entries only (see /FCA Rules):
//   • COBS 4.11.1R(1)  — must make an adequate record of any promotion approved
//   • COBS 4.11.2G     — should record WHY it's satisfied the promotion complies
//   • COBS 4.5.2R      — approved promotion carries WHO approved it and WHEN
//   • COBS 4.11.1R(3)  — retain 3 years (crypto = "any other case")
// AUTHOR-role entries are pre-approval working material: they feed the s21
// approver's decision but never substitute for it or for the record above.
//
// Storage is local-first (this device's browser). Export to CSV/JSON is what
// makes the record portable and lets a firm "produce it quickly and reliably".
// ============================================================================

const STORAGE_KEY = "sn_decision_log";

/** Who kept the flagged copy — see the module header. Legacy entries (written
 *  before roles existed, all approver-framed) default to "approver". */
export type DecisionRole = "author" | "approver";

/** Reason categories, split by role. The author's list never offers "accept
 *  the risk" — accepting residual risk is the approver-only act; the author is
 *  only flagging their reasoning for sign-off to confirm. */
export const REASONS_BY_ROLE: Record<DecisionRole, readonly string[]> = {
  author: [
    "Looks overcautious: flagging for my approver to confirm",
    "Requirement met elsewhere (link / visual / landing page)",
    "May not be a financial promotion in this context",
    "Wording is deliberate: explaining the intent for sign-off",
  ],
  approver: [
    "Overcautious: the flag doesn't meet the regulatory objective here",
    "Requirement satisfied elsewhere (link / visual / landing page)",
    "Rule not engaged in this context (e.g. not a financial promotion)",
    "Risk understood and accepted (documented residual risk)",
  ],
};

/** Role-aware presentation copy. The card action button, the logged-record
 *  badge, and every form label are drawn from here so the two roles never
 *  borrow each other's language. */
export interface RoleCopy {
  /** Primary action on a flagged card. */
  action: string;
  /** Badge on a logged entry. */
  badge: string;
  /** Label for the reason <select>. */
  reasonLabel: string;
  /** Label for the free-text justification. */
  justificationLabel: string;
  /** Placeholder for the justification textarea. */
  justificationPlaceholder: string;
  /** Label for the person field. */
  personLabel: string;
  /** Placeholder for the person field. */
  personPlaceholder: string;
}

export const ROLE_COPY: Record<DecisionRole, RoleCopy> = {
  author: {
    action: "Keep as-is, with a note for sign-off",
    badge: "Kept, with a note for sign-off",
    reasonLabel: "Reason for keeping as-is",
    justificationLabel: "Why keep this as-is? (note for your approver)",
    justificationPlaceholder:
      "Explain your reasoning for the s21 approver: what you considered and why you think the flag doesn't need a change. This note travels to sign-off; it isn't approval.",
    personLabel: "Author",
    personPlaceholder: "Your name or initials",
  },
  approver: {
    action: "Accept risk / override",
    badge: "Risk accepted",
    reasonLabel: "Reason for overriding",
    justificationLabel: "Why is overriding this the right call?",
    justificationPlaceholder:
      "Explain the basis for accepting this risk: what you considered and why the flag doesn't need to change the promotion. This is the record the FCA expects for an approval decision.",
    personLabel: "Approver",
    personPlaceholder: "Name or initials",
  },
};

export interface DecisionLogEntry {
  id: string;
  /** ISO 8601 — contemporaneous timestamp of the decision. */
  timestamp: string;
  /** Who kept the copy. Absent on legacy entries → treated as "approver". */
  role?: DecisionRole;
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
  /** Dropdown category (from REASONS_BY_ROLE for this entry's role). */
  reason: string;
  /** Free-text justification — the load-bearing "why". */
  justification: string;
  /** Who recorded it — name or initials. Role-neutral by storage name; the
   *  approver-accountability reading of COBS 4.5.2R applies only when
   *  role === "approver". */
  approver: string;
  /** The promotion this decision relates to, so the record is self-contained. */
  promotion: string;
}

/** The role a record was written under, defaulting legacy (pre-role) entries to
 *  "approver" — that is what the old approval-framed UI produced. */
export function entryRole(entry: DecisionLogEntry): DecisionRole {
  return entry.role ?? "approver";
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
// Role-neutral headers so an author's note is never exported under a column
// that implies they approved the promotion. "Role" makes the distinction
// explicit for anyone (including the FCA) reading the exported record.
const CSV_COLUMNS: { key: keyof DecisionLogEntry; label: string; derive?: (e: DecisionLogEntry) => string }[] = [
  { key: "timestamp", label: "Timestamp (UTC)" },
  { key: "role", label: "Role", derive: (e) => (entryRole(e) === "approver" ? "Approver (s21 sign-off)" : "Author (note for sign-off)") },
  { key: "approver", label: "Recorded by" },
  { key: "itemType", label: "Type" },
  { key: "rule", label: "Rule / element" },
  { key: "quote", label: "Flagged text / requirement" },
  { key: "issue", label: "Issue raised" },
  { key: "severity", label: "Severity" },
  { key: "reason", label: "Reason" },
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
    CSV_COLUMNS.map((c) => csvCell(c.derive ? c.derive(e) : e[c.key])).join(",")
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
