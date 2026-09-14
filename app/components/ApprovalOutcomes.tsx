"use client";

import { useEffect, useRef, useState } from "react";
import { UsageEntry, getLog } from "@/lib/usageLog";
import {
  Outcome,
  OUTCOME_LABEL,
  PieceRecord,
  factsFor,
  getPieces,
  markSent,
  pendingPieces,
  setOutcome,
  submitOutcome,
  unsentAnswers,
} from "@/lib/outcomeLog";

// Same key page.tsx stores the access LABEL under ("user1"). The label
// identifies a tester without granting anything; the access code never leaves.
const LABEL_KEY = "sn_access_label";

/** How many pending pieces to ask about at once. A month of batched copy could
 *  be dozens; a long list gets skipped, a short one gets answered. */
const SHOW = 5;

function tester(): string {
  return localStorage.getItem(LABEL_KEY) ?? "local";
}

function day(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

/**
 * "Did your approver sign these off?" The exchange testers agreed to: free
 * access for telling us what happened at sign-off. Lists pieces that have been
 * checked but not yet answered, and hides itself when there is nothing to ask.
 * See lib/outcomeLog.ts for what is sent and what stays on the device.
 */
export default function ApprovalOutcomes({
  tick,
  activeSessionId,
  onChange,
}: {
  /** Bumped by the page after each check, so new pieces appear. */
  tick: number;
  /** The piece on screen right now, still being worked, so not asked about. */
  activeSessionId: string | null;
  /** Tells the page an answer was recorded, so the usage panel re-reads. */
  onChange?: () => void;
}) {
  const [pieces, setPieces] = useState<PieceRecord[]>([]);
  const [usage, setUsage] = useState<UsageEntry[]>([]);
  // The row whose "what did your approver say?" box is open.
  const [openId, setOpenId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setPieces(getPieces());
    setUsage(getLog());
  }, [tick]);

  // Once per page load, resend answers that couldn't be sent last time.
  const retried = useRef(false);
  useEffect(() => {
    if (retried.current) return;
    retried.current = true;
    (async () => {
      const log = getLog();
      let changed = false;
      for (const p of unsentAnswers(getPieces())) {
        if (await submitOutcome(p, factsFor(p.sessionId, log), tester())) {
          markSent(p.sessionId);
          changed = true;
        }
      }
      if (changed) {
        setPieces(getPieces());
        onChange?.();
      }
    })();
    // Deliberately runs once on mount; onChange identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = pendingPieces(pieces, usage, activeSessionId);
  if (pending.length === 0 && !notice) return null;

  async function answer(sessionId: string, outcome: Outcome, text?: string) {
    setBusyId(sessionId);
    const updated = setOutcome(sessionId, outcome, text);
    setPieces(updated);
    setOpenId(null);
    setFeedback("");

    if (outcome === "not_sent") {
      // Nothing went to an approver, so there is nothing to report.
      setNotice(null);
      setBusyId(null);
      onChange?.();
      return;
    }

    const piece = updated.find((p) => p.sessionId === sessionId);
    const ok = piece
      ? await submitOutcome(piece, factsFor(sessionId, getLog()), tester())
      : false;
    if (ok) {
      setPieces(markSent(sessionId));
      setNotice("Thanks. That's with us.");
    } else {
      setNotice(
        "Saved on this device. We couldn't send it just now, so we'll try again next time you open the checker."
      );
    }
    setBusyId(null);
    onChange?.();
  }

  return (
    <section className="outcomes" aria-labelledby="outcomes-title">
      <h2 id="outcomes-title" className="outcomes-title">
        Did your approver sign these off?
      </h2>
      <p className="outcomes-sub">
        Once a piece comes back from sign-off, tell us what happened. It&apos;s
        the one thing we ask in return for free access, and it&apos;s how we
        calibrate the checker.
      </p>

      {notice && (
        <p className="outcomes-notice" role="status">
          {notice}
        </p>
      )}

      {pending.length > 0 && (
        <ul className="outcomes-list">
          {pending.slice(0, SHOW).map((p) => {
            const busy = busyId === p.sessionId;
            const { rounds, reachedClean } = p.facts;
            return (
              <li key={p.sessionId} className="outcome-row">
                <div className="outcome-piece">
                  <p className="outcome-label" title={p.label}>
                    &ldquo;{p.label}&rdquo;
                  </p>
                  <p className="outcome-meta">
                    Checked {day(p.facts.lastChecked)} · {rounds}{" "}
                    {rounds === 1 ? "round" : "rounds"}
                    {reachedClean ? " · came back clean" : ""}
                  </p>
                </div>

                {openId === p.sessionId ? (
                  <div className="outcome-feedback">
                    <label
                      htmlFor={`feedback-${p.sessionId}`}
                      className="outcome-feedback-label"
                    >
                      What did your approver say? (optional)
                    </label>
                    <textarea
                      id={`feedback-${p.sessionId}`}
                      rows={3}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Paste their comments, if you have them"
                      autoFocus
                    />
                    <p className="hint">
                      Anything you paste here is sent to StableNarrative.
                    </p>
                    <div className="outcome-actions">
                      <button
                        type="button"
                        className="primary"
                        disabled={busy}
                        onClick={() =>
                          answer(p.sessionId, "sent_back", feedback.trim() || undefined)
                        }
                      >
                        Send
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        disabled={busy}
                        onClick={() => {
                          setOpenId(null);
                          setFeedback("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="outcome-actions">
                    <button
                      type="button"
                      className="ghost outcome-yes"
                      disabled={busy}
                      onClick={() => answer(p.sessionId, "approved_first_time")}
                    >
                      {OUTCOME_LABEL.approved_first_time}
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      disabled={busy}
                      onClick={() => {
                        setOpenId(p.sessionId);
                        setFeedback("");
                      }}
                    >
                      {OUTCOME_LABEL.sent_back}
                    </button>
                    <button
                      type="button"
                      className="ghost outcome-skip"
                      disabled={busy}
                      onClick={() => answer(p.sessionId, "not_sent")}
                    >
                      {OUTCOME_LABEL.not_sent}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {pending.length > SHOW && (
        <p className="hint outcomes-more">
          {pending.length - SHOW} more will show once you&apos;ve answered these.
        </p>
      )}
    </section>
  );
}
