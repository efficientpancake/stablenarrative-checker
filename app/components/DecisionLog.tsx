"use client";

import {
  DecisionLogEntry,
  clearLog,
  exportCSV,
  exportJSON,
  formatWhen,
  removeEntry,
} from "@/lib/decisionLog";

/**
 * The audit trail. Shows every override decision recorded on this device,
 * newest first, with one-click CSV/JSON export so the record is portable and
 * can be "produced quickly and reliably" (the FCA's expectation for approval
 * records — see COBS 4.11).
 */
export default function DecisionLog({
  entries,
  onChange,
}: {
  entries: DecisionLogEntry[];
  onChange: (next: DecisionLogEntry[]) => void;
}) {
  if (entries.length === 0) return null;

  function confirmClear() {
    if (
      window.confirm(
        "Clear the entire decision log on this device? Export it first if you need the record — this can't be undone."
      )
    ) {
      onChange(clearLog());
    }
  }

  return (
    <section className="log">
      <div className="log-head">
        <h2>
          Decision log
          <span className="tag">{entries.length}</span>
        </h2>
        <div className="log-actions">
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

      <p className="log-note">
        Contemporaneous record of every flag an approver overrode — who, when,
        and why. Kept as documentary evidence of the basis for each approval
        decision (COBS 4.11.2G). Retain for at least 3 years.
      </p>

      <ul className="log-list">
        {entries.map((e) => (
          <li key={e.id} className="log-entry">
            <div className="log-entry-top">
              <span className="log-when">{formatWhen(e.timestamp)}</span>
              <span className="log-approver">{e.approver}</span>
              <button
                type="button"
                className="ghost log-undo"
                onClick={() => onChange(removeEntry(e.id))}
                title="Remove this record"
              >
                Undo
              </button>
            </div>
            <p className="log-rule">{e.rule}</p>
            {e.quote && <blockquote className="log-quote">“{e.quote}”</blockquote>}
            <p className="log-reason">
              <span className="log-reason-cat">{e.reason}</span>
            </p>
            <p className="log-just">{e.justification}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
