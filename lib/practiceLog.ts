// ============================================================================
// PRACTICE LOG — which rules you keep breaking.
//
// Sarah's own insight (Mark W meeting 3, 31 Jul), describing why Grammarly
// actually teaches: "you can see like the mistakes you're REPEATING — like I
// always forget to put a comma in front of my 'and', and so I now put a comma
// in front of my 'and'." Explaining a rule once teaches nobody. Being caught
// on the same rule four times is what changes behaviour.
//
// ── Why this is not the decision log ────────────────────────────────────────
// The decision log is FIRM-owned: it travels to the s21 approver, exports to
// CSV, and is the record COBS 4.11 expects. This is LEARNER-owned. It never
// leaves the device, has no export, is not shown to an approver, and records
// no copy — only which rule fired and when.
//
// That distinction is the whole point. Mark's meeting-2 warning was that a
// drafter exposed by their own audit trail will hide things. A counter that
// only the learner can see creates the Grammarly feedback loop WITHOUT
// recreating the exposure: nobody can hold these numbers against you, because
// nobody else can see them. If this ever exports, or an approver view is ever
// added, the safe space is gone and training mode is back to being a worse
// live mode.
//
// Stored separately from sn_decision_log and sn_usage_log so that "training
// records nothing" stays literally true of both of those.
// ============================================================================

const STORAGE_KEY = "sn_practice_log";

export interface PracticeTally {
  /** The rule or required-element name, exactly as the checker names it. */
  rule: string;
  /** How many training runs have flagged this rule. Counts RUNS, not hits: a
   *  phrase repeated three times in one draft is one lesson, not three. */
  count: number;
  /** ISO 8601 of the most recent run that flagged it. */
  last: string;
}

function read(): PracticeTally[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PracticeTally[]) : [];
  } catch {
    return [];
  }
}

function write(tallies: PracticeTally[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tallies));
  } catch {
    /* storage full or blocked — practice history is a convenience, never
       load-bearing, so failing to persist must not break the check. */
  }
}

export function getTallies(): PracticeTally[] {
  return read();
}

/** Count of prior runs that flagged this rule, EXCLUDING the current one.
 *  Returns 0 the first time you make a mistake, 1 the second time, and so on,
 *  so the UI can say "you've hit this before" only when it's actually true. */
export function priorCount(tallies: PracticeTally[], rule: string): number {
  return tallies.find((t) => t.rule === rule)?.count ?? 0;
}

/** Fold one training run's rules into the tally. Pass every rule name the run
 *  flagged; duplicates within the run are collapsed first (one run = one
 *  lesson per rule). Returns the tally as it stood BEFORE this run, so the UI
 *  can show "this is the 3rd time" using the count that excludes today. */
export function recordRun(rules: string[]): PracticeTally[] {
  const before = read();
  const snapshot = before.map((t) => ({ ...t }));
  const now = new Date().toISOString();

  for (const rule of Array.from(new Set(rules))) {
    const existing = before.find((t) => t.rule === rule);
    if (existing) {
      existing.count += 1;
      existing.last = now;
    } else {
      before.push({ rule, count: 1, last: now });
    }
  }

  before.sort((a, b) => b.count - a.count || a.rule.localeCompare(b.rule));
  write(before);
  return snapshot;
}

export function clearPractice(): PracticeTally[] {
  write([]);
  return [];
}

/** The learner's persistent weak spots: rules hit on more than one run,
 *  worst first. Single hits are noise — a rule you broke once is not yet a
 *  habit, and calling it one would make the panel meaningless. */
export function weakSpots(tallies: PracticeTally[]): PracticeTally[] {
  return tallies.filter((t) => t.count > 1);
}

/** "3rd time" / "2nd time" — the nudge that does the actual teaching. */
export function ordinal(n: number): string {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? "th"
      : n % 10 === 1
      ? "st"
      : n % 10 === 2
      ? "nd"
      : n % 10 === 3
      ? "rd"
      : "th";
  return `${n}${suffix}`;
}
