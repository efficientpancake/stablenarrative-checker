"use client";

import { useEffect, useState } from "react";
import { CheckResult, Flag, MissingElement, Severity, Verdict } from "@/lib/types";
import {
  DecisionLogEntry,
  DecisionRole,
  REASONS_BY_ROLE,
  ROLE_COPY,
  addEntry,
  displayRule,
  entryRole,
  flagKey,
  formatWhen,
  getLog,
  missingKey,
  removeEntry,
} from "@/lib/decisionLog";
import { Medium } from "@/lib/medium";
import {
  applyFlagFix,
  applyMissingFix,
  canApplyFlagFix,
  isRiskWarning,
  missingFixText,
} from "@/lib/fixes";
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

// ── Triage ──────────────────────────────────────────────────────────────────
// Rohan's feedback: separate what needs attention now from what doesn't. The
// dividing line is the checker's own verdict rule (lib/ruleset.ts:
// "non_compliant" = any high or medium flag, or any missing required element).
// Anything that on its own makes the copy non-compliant goes under "Fix before
// sign-off". Low flags don't change the verdict, so they go under "Worth a
// look". Nothing is called optional: a low flag is still a flag, and the
// approver still decides.

/** One issue, flag or missing element, ready to render in its group. */
interface Entry {
  key: string;
  item: Overridable;
  flag?: Flag;
  missing?: MissingElement;
  /** Display order: high, then missing, then medium, then low. */
  rank: number;
}

const RANK: Record<Severity, number> = { high: 0, medium: 2, low: 3 };
const MISSING_RANK = 1;
/** Ranks below this make the copy non-compliant on their own. */
const LOOK_RANK = 3;

export default function Results({
  result,
  promotion,
  draft = "",
  medium,
  editable = false,
  onApply,
  onRecheck,
}: {
  result: CheckResult;
  /** The promotion that was checked — stored on each override for a self-contained record. */
  promotion: string;
  /** The copy box as it is NOW. Fixes apply to this, so several fixes stack. */
  draft?: string;
  /** Where the copy is going: decides which risk warning a fix inserts. */
  medium?: Medium;
  /** False when the check included an image or PDF: a fix can only edit text. */
  editable?: boolean;
  /** Writes the fixed draft back into the copy box. */
  onApply?: (next: string) => void;
  /** Runs the check again on the edited draft. */
  onRecheck?: () => void;
}) {
  const { overall_verdict, flags, missing_required } = result;

  // Fixes applied from these results (by item key). A fresh check remounts the
  // component, so this never carries over to a different set of results.
  const [applied, setApplied] = useState<Set<string>>(new Set());

  function markApplied(itemKey: string, next: string | null) {
    if (next === null || !onApply) return;
    onApply(next);
    setApplied((prev) => new Set(prev).add(itemKey));
  }

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

  // Sort is stable, so the engine's own order holds within each severity.
  const entries: Entry[] = [
    ...flags.map((f, i) => ({
      key: `flag-${i}`,
      flag: f,
      rank: RANK[f.severity],
      item: {
        itemType: "flag" as const,
        itemKey: flagKey(f.rule, f.quote),
        rule: f.rule,
        quote: f.quote,
        issue: f.issue,
        severity: f.severity,
      },
    })),
    ...missing_required.map((m, i) => ({
      key: `missing-${i}`,
      missing: m,
      rank: MISSING_RANK,
      item: {
        itemType: "missing" as const,
        itemKey: missingKey(m.element),
        rule: m.element,
        quote: m.requirement,
        issue: m.why,
      },
    })),
  ].sort((a, b) => a.rank - b.rank);
  const fix = entries.filter((e) => e.rank < LOOK_RANK);
  const look = entries.filter((e) => e.rank >= LOOK_RANK);

  function renderCard(e: Entry) {
    const accepted = entryFor(e.item.itemKey);
    const zone = (
      <OverrideZone
        role={role}
        accepted={accepted}
        open={openKey === e.item.itemKey}
        onOpen={() => setOpenKey(e.item.itemKey)}
        onCancel={() => setOpenKey(null)}
        onSave={(fields) => saveOverride(e.item, fields)}
        onUndo={() => accepted && undo(accepted.id)}
      />
    );
    if (e.flag) {
      const f = e.flag;
      return (
        <li
          key={e.key}
          className={`card sev-${f.severity}${accepted ? " accepted" : ""}`}
        >
          <div className="card-head">
            <SeverityPill severity={f.severity} />
            <span className="rule">{displayRule(f.rule)}</span>
          </div>
          <blockquote>
            <span className={`flagged flagged-${f.severity}`}>{f.quote}</span>
          </blockquote>
          <p className="issue">{f.issue}</p>
          {editable && typeof f.fix === "string" && (
            <Suggestion
              kind="flag"
              suggestion={f.fix}
              applied={applied.has(e.item.itemKey)}
            />
          )}
          <CardActions
            apply={
              editable && typeof f.fix === "string" && !applied.has(e.item.itemKey)
                ? {
                    available: canApplyFlagFix(draft, f.quote),
                    onApply: () =>
                      markApplied(
                        e.item.itemKey,
                        applyFlagFix(draft, f.quote, f.fix as string)
                      ),
                  }
                : null
            }
            role={role}
            accepted={!!accepted}
            formOpen={openKey === e.item.itemKey}
            onOpen={() => setOpenKey(e.item.itemKey)}
          />
          {zone}
        </li>
      );
    }
    const m = e.missing as MissingElement;
    // The risk warning always comes from the rulebook for this channel.
    const missingText = medium ? missingFixText(m.element, m.fix, medium) : null;
    return (
      <li key={e.key} className={`card sev-missing${accepted ? " accepted" : ""}`}>
        <div className="card-head">
          <span className="pill pill-missing">Missing</span>
          <span className="rule strong">{m.element}</span>
        </div>
        <dl className="facts">
          <div className="fact">
            <dt>Required</dt>
            <dd>{m.requirement}</dd>
          </div>
          <div className="fact">
            <dt>Why flagged</dt>
            <dd>{m.why}</dd>
          </div>
        </dl>
        {editable && medium && missingText && (
          <Suggestion
            kind="missing"
            suggestion={missingText}
            warningFor={isRiskWarning(m.element) ? medium.noun : undefined}
            applied={applied.has(e.item.itemKey)}
          />
        )}
        <CardActions
          apply={
            editable && medium && missingText && !applied.has(e.item.itemKey)
              ? {
                  available: true,
                  onApply: () =>
                    markApplied(
                      e.item.itemKey,
                      applyMissingFix(draft, m.element, missingText)
                    ),
                }
              : null
          }
          role={role}
          accepted={!!accepted}
          formOpen={openKey === e.item.itemKey}
          onOpen={() => setOpenKey(e.item.itemKey)}
        />
        {zone}
      </li>
    );
  }

  return (
    <>
      <section className="results">
        <div className={`verdict verdict-${overall_verdict}`}>
          <span className="dot" />
          <span className="verdict-text">{VERDICT_LABEL[overall_verdict]}</span>
          <span className="verdict-count">
            {fix.length === 0
              ? "Nothing to fix before sign-off"
              : `${fix.length} to fix before sign-off`}
            {look.length > 0 ? ` · ${look.length} worth a look` : ""}
          </span>
          <RoleToggle role={role} onChange={setRole} />
        </div>

        {applied.size > 0 && (
          <div className="edited-banner" role="status">
            <p>
              You&apos;ve changed your draft. Check it again to confirm it&apos;s
              clean before it goes to your approver.
            </p>
            {onRecheck && (
              <button type="button" className="primary" onClick={onRecheck}>
                Check again
              </button>
            )}
          </div>
        )}

        <div className="col triage-fix">
          <h2>
            Fix before sign-off
            <span className="tag">{fix.length}</span>
          </h2>
          <p className="triage-note">
            Each of these makes the copy non-compliant on its own.{" "}
            {role === "approver"
              ? "Change the copy, or record why the risk is acceptable."
              : "Change the copy, or keep it and note why for your approver."}
          </p>
          {fix.length === 0 ? (
            <p className="empty">Nothing here makes the copy non-compliant.</p>
          ) : (
            <ul className="cards">{fix.map(renderCard)}</ul>
          )}
        </div>

        {look.length > 0 && (
          <div className="col triage-look">
            <h2>
              Worth a look
              <span className="tag">{look.length}</span>
            </h2>
            <p className="triage-note">
              Minor points. None of these makes the copy non-compliant on its
              own,{" "}
              {role === "approver"
                ? "so you can judge them in context."
                : "and your approver may accept them."}
            </p>
            <ul className="cards">{look.map(renderCard)}</ul>
          </div>
        )}
      </section>

      <DecisionLog entries={log} onChange={setLog} />
    </>
  );
}

/** The suggested change, shown before anything is clicked: the panel only.
 *  The buttons live in CardActions below it, so one row of a card holds every
 *  action (Rohan, 20 Sept: the card was cluttered and hard to scan). */
function Suggestion({
  kind,
  suggestion,
  warningFor,
  applied,
}: {
  kind: "flag" | "missing";
  /** Replacement words ("" = delete them), or the text to add. */
  suggestion: string;
  /** Set when the fix inserts the prescribed warning: the channel's name. */
  warningFor?: string;
  applied: boolean;
}) {
  if (applied) {
    return (
      <p className="suggest-done">
        <CheckIcon />
        Applied to your draft
      </p>
    );
  }
  const deletes = kind === "flag" && suggestion === "";
  return (
    <div className="suggest">
      <BulbIcon />
      <div>
        <p className="suggest-title">
          {deletes
            ? "Suggested fix"
            : kind === "missing"
            ? "Suggested addition"
            : "Suggested wording"}
        </p>
        <p className="suggest-text">
          {deletes ? "Remove these words." : suggestion}
        </p>
        {warningFor && (
          <p className="suggest-note">
            The FCA&apos;s prescribed risk warning for a {warningFor}, word for
            word. It goes at the start of your copy.
          </p>
        )}
      </div>
    </div>
  );
}

/** Every action on a card, in one row: the fix on the left as the single
 *  filled button, the reasoned "keep it" decision on the right. */
function CardActions({
  apply,
  role,
  accepted,
  formOpen,
  onOpen,
}: {
  /** Null when there is nothing to apply: no text fix, or already applied. */
  apply: { available: boolean; onApply: () => void } | null;
  role: DecisionRole;
  accepted: boolean;
  formOpen: boolean;
  onOpen: () => void;
}) {
  // A logged decision or an open form replaces the row entirely.
  if (accepted || formOpen) return null;
  const copy = ROLE_COPY[role];
  return (
    <div className="card-actions">
      {apply && (
        <button
          type="button"
          className="primary card-apply"
          disabled={!apply.available}
          onClick={apply.onApply}
        >
          Apply fix
        </button>
      )}
      {apply && !apply.available && (
        <p className="card-actions-note">
          These words aren&apos;t in your draft any more, so there&apos;s nothing
          to swap.
        </p>
      )}
      <button type="button" className="ghost keep-btn" onClick={onOpen}>
        <NoteIcon />
        <span className="keep-lines">
          <span className="keep-title">{copy.action}</span>
          <span className="keep-sub">{copy.actionSub}</span>
        </span>
      </button>
    </div>
  );
}

function BulbIcon() {
  return (
    <svg className="suggest-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.5.4.8 1 .9 1.6l.1.6h5.2l.1-.6c.1-.6.4-1.2.9-1.6A6 6 0 0 0 12 3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg className="keep-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z M14 3v5h5 M9 13h6 M9 17h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="done-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M5 12.5l4.2 4.2L19 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

  if (!open) return null;

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
  const label = severity.charAt(0).toUpperCase() + severity.slice(1);
  return <span className={`pill pill-${severity}`}>{label}</span>;
}

