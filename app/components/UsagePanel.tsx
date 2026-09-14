"use client";

import { useEffect, useState } from "react";
import {
  UsageEntry,
  UsageSummary,
  clearLog,
  exportCSV,
  exportJSON,
  getLog,
  summarize,
} from "@/lib/usageLog";
import { getPieces, summarizeOutcomes } from "@/lib/outcomeLog";

/**
 * Measurement readout for the pilot — not part of the tester's task. Kept in a
 * collapsed panel so it stays out of the way, but reachable so a tester (or the
 * pilot) can export the "rounds saved" record off this device. Refreshes each
 * time `tick` changes — the parent bumps it after every check.
 */
export default function UsagePanel({ tick }: { tick: number }) {
  const [entries, setEntries] = useState<UsageEntry[]>([]);
  useEffect(() => setEntries(getLog()), [tick]);

  if (entries.length === 0) return null;

  const s: UsageSummary = summarize(entries);
  const o = summarizeOutcomes(getPieces());

  function confirmClear() {
    if (
      window.confirm(
        "Clear the usage log on this device? Export it first if you need the record. This can't be undone."
      )
    ) {
      setEntries(clearLog());
    }
  }

  return (
    <details className="usage">
      <summary className="usage-summary">
        Usage &amp; measurement
        <span className="tag">{s.totalChecks}</span>
      </summary>

      <div className="usage-body">
        <p className="usage-note">
          One row per check on this device: who, when, the verdict, issues
          caught, and how many re-check rounds each piece took to come back
          clean. A piece stays one session across every tweak (even after it
          first goes clean) until you hit “New copy.” Every iteration here is an
          approver round the tool stood in for. “Approved first time” counts the
          pieces you&apos;ve reported back on after sign-off.
        </p>

        <div className="usage-stats">
          <Stat value={s.totalChecks} label="checks" />
          <Stat value={s.roundsSaved} label="rounds saved" strong />
          <Stat
            value={`${s.sessionsCleared}/${s.sessions}`}
            label="reached clean"
          />
          <Stat
            value={s.avgRoundsToClean == null ? "—" : s.avgRoundsToClean.toFixed(1)}
            label="avg rounds to clean"
          />
          <Stat
            value={o.answered === 0 ? "—" : `${o.approvedFirstTime}/${o.answered}`}
            label="approved first time"
          />
          <Stat value={s.flagsCaught} label="flags caught" />
          <Stat value={s.missingCaught} label="missing caught" />
        </div>

        <div className="usage-actions">
          <button type="button" className="ghost" onClick={() => exportCSV(entries)}>
            Export CSV
          </button>
          <button type="button" className="ghost" onClick={() => exportJSON(entries)}>
            Export JSON
          </button>
          <button type="button" className="ghost log-clear" onClick={confirmClear}>
            Clear
          </button>
        </div>
      </div>
    </details>
  );
}

function Stat({
  value,
  label,
  strong,
}: {
  value: string | number;
  label: string;
  strong?: boolean;
}) {
  return (
    <div className={`usage-stat${strong ? " usage-stat-strong" : ""}`}>
      <span className="usage-stat-value">{value}</span>
      <span className="usage-stat-label">{label}</span>
    </div>
  );
}
