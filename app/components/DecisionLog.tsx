"use client";

import {
  DecisionLogEntry,
  ROLE_COPY,
  clearLog,
  entryRole,
  exportCSV,
  exportJSON,
  formatWhen,
  removeEntry,
} from "@/lib/decisionLog";

/**
 * The decision trail. Shows every checker flag someone chose to keep on this
 * device, newest first, with one-click CSV/JSON export so the record is
 * portable and can be "produced quickly and reliably". Two kinds of record
 * live here and are kept visibly distinct: an author's note for sign-off, and
 * an approver's override — only the latter is a COBS 4.11 approval record.
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
        "Clear the entire decision log on this device? Export it first if you need the record. This can't be undone."
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
        Contemporaneous record of every flag someone chose to keep: who, when,
        and why. Author notes are working material for the s21 approver, not an
        approval. An approver’s override is the approval record COBS 4.11.2G
        expects; retain those for at least 3 years.
      </p>

      <ul className="log-list">
        {entries.map((e) => {
          const role = entryRole(e);
          return (
            <li key={e.id} className={`log-entry log-entry-${role}`}>
              <div className="log-entry-top">
                <span className={`log-role log-role-${role}`}>
                  {role === "approver" ? "Approver" : "Author note"}
                </span>
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
                <span className="log-badge">{ROLE_COPY[role].badge}</span>
                <span className="log-reason-cat">{e.reason}</span>
              </p>
              <p className="log-just">{e.justification}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
