"use client";

import { useEffect, useState } from "react";
import { CheckResult, Severity, Verdict } from "@/lib/types";
import {
  DecisionLogEntry,
  OVERRIDE_REASONS,
  addEntry,
  flagKey,
  formatWhen,
  getLog,
  missingKey,
  removeEntry,
} from "@/lib/decisionLog";
import DecisionLog from "./DecisionLog";

const VERDICT_LABEL: Record<Verdict, string> = {
  non_compliant: "Non-compliant",
  compliant: "Compliant",
  needs_review: "Needs review",
};

/** The shape an override form needs to log a decision about one flagged item. */
interface Overridable {
  itemType: "flag" | "missing";
  itemKey: string;
  rule: string;
  quote: string;
  issue: string;
  severity?: string;
}

export default function Results({
  result,
  promotion,
}: {
  result: CheckResult;
  /** The promotion that was checked — stored on each override for a self-contained record. */
  promotion: string;
}) {
  const { overall_verdict, flags, missing_required, compliant_rewrite } = result;

  // The full decision log, loaded from this device. Kept here so both the
  // per-item "accepted" state and the log panel below stay in sync.
  const [log, setLog] = useState<DecisionLogEntry[]>([]);
  useEffect(() => setLog(getLog()), []);

  // Which item's override form is currently open (by itemKey), or null.
  const [openKey, setOpenKey] = useState<string | null>(null);

  // An override for THIS promotion + item, if one exists.
  function entryFor(itemKey: string): DecisionLogEntry | undefined {
    return log.find((e) => e.itemKey === itemKey && e.promotion === promotion);
  }

  function saveOverride(
    item: Overridable,
    fields: { reason: string; justification: string; approver: string }
  ) {
    setLog(
      addEntry({
        itemType: item.itemType,
        itemKey: item.itemKey,
        rule: item.rule,
        quote: item.quote,
        issue: item.issue,
        severity: item.severity,
        reason: fields.reason,
        justification: fields.justification,
        approver: fields.approver,
        promotion,
      })
    );
    setOpenKey(null);
  }

  function undo(entryId: string) {
    setLog(removeEntry(entryId));
  }

  return (
    <>
      <section className="results">
        <div className={`verdict verdict-${overall_verdict}`}>
          <span className="dot" />
          <span className="verdict-text">{VERDICT_LABEL[overall_verdict]}</span>
          <span className="verdict-count">
            {flags.length} flag{flags.length === 1 ? "" : "s"} ·{" "}
            {missing_required.length} missing element
            {missing_required.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="col">
          <h2>
            Prohibited content
            <span className="tag">{flags.length}</span>
          </h2>
          {flags.length === 0 ? (
            <p className="empty">No prohibited content flagged.</p>
          ) : (
            <ul className="cards">
              {flags.map((f, i) => {
                const item: Overridable = {
                  itemType: "flag",
                  itemKey: flagKey(f.rule, f.quote),
                  rule: f.rule,
                  quote: f.quote,
                  issue: f.issue,
                  severity: f.severity,
                };
                const accepted = entryFor(item.itemKey);
                return (
                  <li
                    key={i}
                    className={`card sev-${f.severity}${accepted ? " accepted" : ""}`}
                  >
                    <div className="card-head">
                      <SeverityPill severity={f.severity} />
                      <span className="rule">{f.rule}</span>
                    </div>
                    <blockquote>“{f.quote}”</blockquote>
                    <p className="issue">{f.issue}</p>
                    <OverrideZone
                      item={item}
                      accepted={accepted}
                      open={openKey === item.itemKey}
                      onOpen={() => setOpenKey(item.itemKey)}
                      onCancel={() => setOpenKey(null)}
                      onSave={(fields) => saveOverride(item, fields)}
                      onUndo={() => accepted && undo(accepted.id)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="col">
          <h2>
            Missing required elements
            <span className="tag">{missing_required.length}</span>
          </h2>
          {missing_required.length === 0 ? (
            <p className="empty">Nothing mandatory appears to be missing.</p>
          ) : (
            <ul className="cards">
              {missing_required.map((m, i) => {
                const item: Overridable = {
                  itemType: "missing",
                  itemKey: missingKey(m.element),
                  rule: m.element,
                  quote: m.requirement,
                  issue: m.why,
                };
                const accepted = entryFor(item.itemKey);
                return (
                  <li
                    key={i}
                    className={`card sev-missing${accepted ? " accepted" : ""}`}
                  >
                    <div className="card-head">
                      <span className="rule strong">{m.element}</span>
                    </div>
                    <p className="issue">
                      <strong>Required:</strong> {m.requirement}
                    </p>
                    <p className="issue">
                      <strong>Why flagged:</strong> {m.why}
                    </p>
                    <OverrideZone
                      item={item}
                      accepted={accepted}
                      open={openKey === item.itemKey}
                      onOpen={() => setOpenKey(item.itemKey)}
                      onCancel={() => setOpenKey(null)}
                      onSave={(fields) => saveOverride(item, fields)}
                      onUndo={() => accepted && undo(accepted.id)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="col">
          <h2>
            Compliant rewrite
            <CopyButton text={compliant_rewrite} />
          </h2>
          <div className="rewrite">{compliant_rewrite}</div>
        </div>
      </section>

      <DecisionLog entries={log} onChange={setLog} />
    </>
  );
}

/** The override control on a single card: a button → an inline reasoned form,
 *  or a compact "risk accepted" record once a decision has been logged. */
function OverrideZone({
  item,
  accepted,
  open,
  onOpen,
  onCancel,
  onSave,
  onUndo,
}: {
  item: Overridable;
  accepted?: DecisionLogEntry;
  open: boolean;
  onOpen: () => void;
  onCancel: () => void;
  onSave: (fields: { reason: string; justification: string; approver: string }) => void;
  onUndo: () => void;
}) {
  if (accepted) {
    return (
      <div className="override-accepted">
        <div className="override-accepted-head">
          <span className="accepted-badge">Risk accepted</span>
          <span className="accepted-meta">
            {accepted.approver} · {formatWhen(accepted.timestamp)}
          </span>
          <button type="button" className="ghost override-undo" onClick={onUndo}>
            Undo
          </button>
        </div>
        <p className="accepted-reason">{accepted.reason}</p>
        <p className="accepted-just">{accepted.justification}</p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="override-bar">
        <button type="button" className="ghost override-open" onClick={onOpen}>
          Accept risk / override
        </button>
      </div>
    );
  }

  return <OverrideForm item={item} onCancel={onCancel} onSave={onSave} />;
}

function OverrideForm({
  onCancel,
  onSave,
}: {
  item: Overridable;
  onCancel: () => void;
  onSave: (fields: { reason: string; justification: string; approver: string }) => void;
}) {
  const [reason, setReason] = useState<string>(OVERRIDE_REASONS[0]);
  const [justification, setJustification] = useState("");
  const [approver, setApprover] = useState("");

  const canSave = justification.trim().length > 0 && approver.trim().length > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    onSave({ reason, justification: justification.trim(), approver: approver.trim() });
  }

  return (
    <form className="override-form" onSubmit={submit}>
      <label className="override-label">
        Reason for overriding
        <select
          className="override-select"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          {OVERRIDE_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      <label className="override-label">
        Why is overriding this the right call?
        <textarea
          className="override-textarea"
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder="Explain the basis for accepting this risk — what you considered and why the flag doesn't need to change the promotion. This is the record the FCA expects."
          rows={3}
        />
      </label>

      <div className="override-foot">
        <label className="override-label override-approver">
          Approver
          <input
            className="override-input"
            value={approver}
            onChange={(e) => setApprover(e.target.value)}
            placeholder="Name or initials"
            autoComplete="off"
          />
        </label>
        <div className="override-buttons">
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="primary override-save" disabled={!canSave}>
            Log decision
          </button>
        </div>
      </div>
    </form>
  );
}

function SeverityPill({ severity }: { severity: Severity }) {
  return <span className={`pill pill-${severity}`}>{severity}</span>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }
  return (
    <button
      type="button"
      className={`ghost copy-btn${copied ? " copied" : ""}`}
      onClick={copy}
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}
