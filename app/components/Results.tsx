"use client";

import { useEffect, useState } from "react";
import { CheckResult, Severity, Verdict } from "@/lib/types";
import {
  DecisionLogEntry,
  DecisionRole,
  REASONS_BY_ROLE,
  ROLE_COPY,
  addEntry,
  entryRole,
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

  // Who is using the tool. Default is the marketer/author — the copy still
  // has to reach an s21 approver — so keeping a flag is a note for sign-off,
  // not an approval. Enterprise approver-users switch this to "approver".
  const [role, setRole] = useState<DecisionRole>("author");

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
        role,
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
          <RoleToggle role={role} onChange={setRole} />
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
                      role={role}
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
                      role={role}
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

/** Role switch: who is recording this decision. The default author case keeps
 *  copy with a note for sign-off; the approver case is the enterprise s21 user
 *  whose call IS the approval. Same control, opposite regulatory weight. */
function RoleToggle({
  role,
  onChange,
}: {
  role: DecisionRole;
  onChange: (role: DecisionRole) => void;
}) {
  return (
    <div className="role-toggle" role="group" aria-label="I am recording as">
      <span className="role-toggle-label">I’m the</span>
      {(["author", "approver"] as DecisionRole[]).map((r) => (
        <button
          key={r}
          type="button"
          className={`role-toggle-opt${role === r ? " is-active" : ""}`}
          aria-pressed={role === r}
          onClick={() => onChange(r)}
        >
          {r === "author" ? "Author" : "s21 approver"}
        </button>
      ))}
    </div>
  );
}

/** The decision control on a single card: a button → an inline reasoned form,
 *  or a compact record once a decision has been logged. Copy is role-aware —
 *  an author keeps copy with a note for sign-off; only an approver accepts risk.
 *  A logged record is shown under the role it was written with, not the role
 *  currently selected. */
function OverrideZone({
  role,
  accepted,
  open,
  onOpen,
  onCancel,
  onSave,
  onUndo,
}: {
  role: DecisionRole;
  accepted?: DecisionLogEntry;
  open: boolean;
  onOpen: () => void;
  onCancel: () => void;
  onSave: (fields: { reason: string; justification: string; approver: string }) => void;
  onUndo: () => void;
}) {
  if (accepted) {
    const acceptedRole = entryRole(accepted);
    const acceptedCopy = ROLE_COPY[acceptedRole];
    return (
      <div className={`override-accepted override-accepted-${acceptedRole}`}>
        <div className="override-accepted-head">
          <span className="accepted-badge">{acceptedCopy.badge}</span>
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
          {ROLE_COPY[role].action}
        </button>
      </div>
    );
  }

  return <OverrideForm role={role} onCancel={onCancel} onSave={onSave} />;
}

function OverrideForm({
  role,
  onCancel,
  onSave,
}: {
  role: DecisionRole;
  onCancel: () => void;
  onSave: (fields: { reason: string; justification: string; approver: string }) => void;
}) {
  const copy = ROLE_COPY[role];
  const reasons = REASONS_BY_ROLE[role];
  const [reason, setReason] = useState<string>(reasons[0]);
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
        {copy.reasonLabel}
        <select
          className="override-select"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          {reasons.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      <label className="override-label">
        {copy.justificationLabel}
        <textarea
          className="override-textarea"
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder={copy.justificationPlaceholder}
          rows={3}
        />
      </label>

      <div className="override-foot">
        <label className="override-label override-approver">
          {copy.personLabel}
          <input
            className="override-input"
            value={approver}
            onChange={(e) => setApprover(e.target.value)}
            placeholder={copy.personPlaceholder}
            autoComplete="off"
          />
        </label>
        <div className="override-buttons">
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="primary override-save" disabled={!canSave}>
            {role === "approver" ? "Log decision" : "Save note"}
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
