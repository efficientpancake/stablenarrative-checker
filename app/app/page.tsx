"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckResult } from "@/lib/types";
import { recordCheck, resetSession } from "@/lib/usageLog";
import { rememberPiece } from "@/lib/outcomeLog";
import Results, { WeakSpots } from "@/app/components/Results";
import { CheckMode, MODE_COPY, TRAINING_BRIEF } from "@/lib/trainingMode";
import { PracticeTally, getTallies, recordRun } from "@/lib/practiceLog";
import ApprovalOutcomes from "@/app/components/ApprovalOutcomes";
import Rewrites from "@/app/components/Rewrites";
import { MEDIA, MediumId, DEFAULT_MEDIUM, getMedium } from "@/lib/medium";
import UsagePanel from "@/app/components/UsagePanel";
import ThemeToggle from "@/app/components/ThemeToggle";
import Logo from "@/app/components/Logo";

const STORAGE_KEY = "sn_access_code";
// The tester's LABEL ("user1"), stored so a support report can say who sent it.
// Deliberately separate from the code: the code unlocks an API key and must
// never leave this device; the label identifies without granting anything.
const LABEL_KEY = "sn_access_label";

const EXAMPLE = `Own uranium on-chain with xU3O8. A safe, guaranteed store of value backed by real assets.
Don't miss out, get in before the next bull run.`;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB (stays under Netlify's request limit after base64)

const ACCEPT =
  "image/png,image/jpeg,image/gif,image/webp,application/pdf,.pdf," +
  ".txt,text/plain,.docx," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type FileKind = "image" | "pdf" | "docx" | "txt";

/** A file the client sends to the API (image/pdf/docx). TXT is folded into copy. */
interface Attachment {
  kind: "image" | "pdf" | "docx";
  data: string; // base64, no data: prefix
  mediaType?: string;
  name: string;
  previewUrl?: string; // images only
}

function classify(file: File): FileKind | null {
  const t = file.type;
  const name = file.name.toLowerCase();
  if (IMAGE_TYPES.includes(t) || /\.(png|jpe?g|gif|webp)$/.test(name)) return "image";
  if (t === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx") || t.includes("wordprocessingml")) return "docx";
  if (t === "text/plain" || name.endsWith(".txt")) return "txt";
  return null;
}

function imageMediaType(file: File): string {
  if (IMAGE_TYPES.includes(file.type)) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [copy, setCopy] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  // The promotion captured at check time, so an override logged later records
  // exactly what was assessed (even if the copy box is edited afterwards).
  const [checkedPromotion, setCheckedPromotion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped after each recorded check so the usage panel re-reads the log.
  const [usageTick, setUsageTick] = useState(0);
  // The piece currently being worked (its usage session). Not yet sent to an
  // approver, so the "did it get signed off?" list leaves it out.
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  // Where the copy is going. It decides which risk warning is required, what a
  // one-click fix inserts, and how long a rewrite may be. See lib/medium.ts.
  const [medium, setMedium] = useState<MediumId>(DEFAULT_MEDIUM);
  // Live vs training. Deliberately not persisted: every load starts in Live,
  // because a stale training mode mistaken for a real check is the exact
  // failure this tool exists to prevent. See lib/trainingMode.ts.
  const [mode, setMode] = useState<CheckMode>("live");
  const training = mode === "training";
  // The learner's repeat-mistake tally BEFORE the run on screen (for "3rd
  // time" on a card) and AFTER it (for the weak-spots summary). Device-local,
  // never exported, never shown to an approver: see lib/practiceLog.ts.
  const [priorTallies, setPriorTallies] = useState<PracticeTally[]>([]);
  const [currentTallies, setCurrentTallies] = useState<PracticeTally[]>([]);
  // Bumped on every check, so results and their applied fixes start fresh.
  const [checkId, setCheckId] = useState(0);
  // Fixes and rewrites edit text. A check that included an image or PDF can't
  // be fixed by editing the copy box, so they're hidden for those.
  const [checkedHadAttachment, setCheckedHadAttachment] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Access gate. null = still checking; true = unlocked (or app is ungated);
  // false = show the code screen.
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [gateInput, setGateInput] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);
  const [gateBusy, setGateBusy] = useState(false);

  // On load, validate any stored code (spends no API tokens). If the app is
  // ungated, the probe returns ok and we unlock immediately.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    (async () => {
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code: stored }),
        });
        const data = await res.json();
        setUnlocked(data.ok === true);
        if (data.ok && data.label) localStorage.setItem(LABEL_KEY, data.label);
      } catch {
        setUnlocked(false);
      }
    })();
  }, []);

  async function submitGate(e: React.FormEvent) {
    e.preventDefault();
    setGateBusy(true);
    setGateError(null);
    try {
      const code = gateInput.trim();
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem(STORAGE_KEY, code);
        if (data.label) localStorage.setItem(LABEL_KEY, data.label);
        setUnlocked(true);
      } else {
        setGateError(
          data.reason === "invalid"
            ? "That access code isn't valid."
            : "Please enter your access code."
        );
      }
    } catch {
      setGateError("Something went wrong. Please try again.");
    } finally {
      setGateBusy(false);
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const kind = classify(file);
    if (!kind) {
      setError("Unsupported file. Use an image, PDF, Word (.docx), or text (.txt) file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("File is too large. Please keep it under 4 MB.");
      return;
    }
    setError(null);

    // TXT: read the text right here and drop it into the copy box (visible + editable).
    if (kind === "txt") {
      const text = await file.text();
      setCopy((prev) => (prev.trim() ? `${prev}\n\n${text}` : text));
      if (fileInput.current) fileInput.current.value = "";
      return;
    }

    const data = await fileToBase64(file);
    setAttachment({
      kind,
      data,
      name: file.name,
      mediaType: kind === "image" ? imageMediaType(file) : undefined,
      previewUrl: kind === "image" ? URL.createObjectURL(file) : undefined,
    });
  }

  function clearAttachment() {
    if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  // Start a genuinely new piece of copy: clear the workspace and close the
  // current usage session so the next check is logged as round 1 of a new
  // piece (tweaking existing copy in place stays the same session).
  function startNewCopy() {
    setCopy("");
    clearAttachment();
    setResult(null);
    setError(null);
    setCheckedPromotion("");
    resetSession();
    setActiveSessionId(null);
  }

  // Switching mode clears the workspace. Carrying real copy into training, or
  // a practice draft into live, is how someone checks the wrong thing under
  // the wrong rules about what gets recorded.
  function switchMode(next: CheckMode) {
    if (next === mode) return;
    setMode(next);
    if (next === "training") {
      const t = getTallies();
      setPriorTallies(t);
      setCurrentTallies(t);
    }
    startNewCopy();
  }

  async function check(textOverride?: string) {
    const text = textOverride ?? copy;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const file = attachment
        ? { kind: attachment.kind, data: attachment.data, mediaType: attachment.mediaType }
        : undefined;
      const res = await fetch("/api/check", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-access-code": localStorage.getItem(STORAGE_KEY) ?? "",
        },
        body: JSON.stringify({ copy: text, file, medium, mode }),
      });
      const data = await res.json();
      if (res.status === 401) {
        // Code no longer valid (e.g. rotated) — send them back to the gate.
        localStorage.removeItem(STORAGE_KEY);
        setUnlocked(false);
        throw new Error("Please re-enter your access code.");
      }
      if (!res.ok) throw new Error(data.error || "Check failed");
      const checked = data as CheckResult;
      setResult(checked);
      setCheckedHadAttachment(!!attachment);
      setCheckId((n) => n + 1);
      setCheckedPromotion(
        text.trim()
          ? text.trim()
          : attachment
          ? `[Attached ${attachment.kind}: ${attachment.name}]`
          : ""
      );
      // Training runs are practice reps, not checks: they feed the learner's
      // own tally and nothing else. No usage log, no sign-off question.
      if (training) {
        setPriorTallies(
          recordRun([
            ...checked.flags.map((f) => f.rule),
            ...checked.missing_required.map((m) => m.element),
          ])
        );
        setCurrentTallies(getTallies());
        return;
      }
      // Measurement: log this check so re-checks-until-clean can be counted.
      const log = recordCheck({
        tester: localStorage.getItem(LABEL_KEY) ?? "local",
        verdict: checked.overall_verdict,
        flags: checked.flags.length,
        missing: checked.missing_required.length,
        chars: text.trim().length,
      });
      // Remember this piece so the tester can report its sign-off outcome
      // later. The preview label stays on this device; see lib/outcomeLog.ts.
      const sessionId = log[0]?.sessionId;
      if (sessionId) {
        rememberPiece(
          sessionId,
          text.trim() ||
            (attachment ? `Attached ${attachment.kind}: ${attachment.name}` : "")
        );
        setActiveSessionId(sessionId);
      }
      setUsageTick((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const canCheck = copy.trim().length > 0 || attachment !== null;
  const isVisual = attachment?.kind === "image" || attachment?.kind === "pdf";

  if (unlocked === null) {
    return (
      <main className="wrap">
        <p className="sub" style={{ marginTop: "18vh", textAlign: "center" }}>
          Loading…
        </p>
      </main>
    );
  }

  if (!unlocked) {
    return (
      <main className="wrap">
        <header className="head">
          <div className="brand">
            <Logo />
            <div className="brand-actions">
              <Link href="/support" className="button-link ghost">
                Support
              </Link>
              <ThemeToggle />
            </div>
          </div>
          <h1>Enter your access code</h1>
          <p className="sub">
            Enter the access code you were given to continue. You’ll only need
            to do this once on this device.
          </p>
        </header>
        <section className="panel gate-panel">
          <form onSubmit={submitGate} className="editor">
            <input
              type="text"
              className="field-input"
              value={gateInput}
              onChange={(e) => setGateInput(e.target.value)}
              placeholder="Access code"
              autoFocus
              autoComplete="off"
            />
            <div className="actions">
              <button
                className="primary"
                type="submit"
                disabled={gateBusy || !gateInput.trim()}
              >
                {gateBusy && <span className="spinner" />}
                {gateBusy ? "Checking…" : "Continue"}
              </button>
            </div>
            {gateError && <div className="error">{gateError}</div>}
          </form>
        </section>
        {/* The code failing IS the bug most worth hearing about, so support has
            to be reachable from the locked screen — not just from inside. */}
        <footer className="foot">
          Access code not working, or don&apos;t have one?{" "}
          <Link className="foot-link" href="/support">
            Get in touch with us
          </Link>
          .
        </footer>
      </main>
    );
  }

  return (
    <main className="wrap" data-mode={mode}>
      <header className="head">
        <div className="brand">
          <Logo />
          <div className="brand-actions">
            {/* One switch, in the header: "Training Mode" goes in, "Pre-check
                Mode" comes back out to the real check. */}
            <button
              type="button"
              className="ghost mode-switch"
              aria-pressed={training}
              onClick={() => switchMode(training ? "live" : "training")}
            >
              {training ? "Pre-check Mode" : "Training Mode"}
            </button>
            <Link href="/support" className="button-link ghost">
              Support
            </Link>
            <ThemeToggle />
          </div>
        </div>
        {training ? (
          <>
            <h1>Training Mode</h1>
            <p className="sub">{MODE_COPY.training.promise}</p>
          </>
        ) : (
          <>
            <h1>FCA compliance check for UK crypto marketing copy</h1>
            <p className="sub">
              Paste or upload your promotion, get it checked against FCA rules, then send it to your s21 approver for sign-off.
            </p>
          </>
        )}
      </header>

      {training ? (
        <>
          <WeakSpots tallies={currentTallies} />
          <section className="training-brief">
            <h2 className="training-brief-title">{TRAINING_BRIEF.title}</h2>
            <p className="training-brief-body">{TRAINING_BRIEF.body}</p>
            <button
              type="button"
              className="ghost"
              onClick={() => setCopy(TRAINING_BRIEF.example)}
            >
              Or start from one I prepared earlier
            </button>
          </section>
        </>
      ) : (
        <ApprovalOutcomes
          tick={usageTick}
          activeSessionId={activeSessionId}
          onChange={() => setUsageTick((n) => n + 1)}
        />
      )}

      <div className="workspace">
        <section className="panel">
          <div className="editor">
            <div className="editor-top">
              <label htmlFor="copy">{training ? "Your draft" : "Marketing copy"}</label>
              {/* Training has its own worked example in the brief above. */}
              {!training && (
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setCopy(EXAMPLE)}
                >
                  Load example
                </button>
              )}
            </div>
            <textarea
              id="copy"
              value={copy}
              onChange={(e) => setCopy(e.target.value)}
              placeholder="Paste the tweet, landing-page hero, ad, or CTA here, or attach a file below…"
              rows={10}
            />

            <div className="medium-row">
              <label htmlFor="medium" className="medium-label">
                Where&apos;s this going?
              </label>
              <select
                id="medium"
                className="medium-select"
                value={medium}
                onChange={(e) => setMedium(e.target.value as MediumId)}
              >
                {MEDIA.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <p className="hint medium-note">{getMedium(medium).note}</p>
            </div>

            <div className="attach">
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPT}
                onChange={onPickFile}
                style={{ display: "none" }}
              />
              {!attachment ? (
                <button
                  type="button"
                  className="ghost"
                  onClick={() => fileInput.current?.click()}
                >
                  + Attach file (image, PDF, Word, or text)
                </button>
              ) : (
                <div
                  className="attach-preview"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    marginTop: "0.5rem",
                  }}
                >
                  {attachment.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={attachment.previewUrl}
                      alt="Promotion preview"
                      style={{
                        height: 56,
                        width: 56,
                        objectFit: "cover",
                        borderRadius: 8,
                        border: "1px solid var(--border, #ccc)",
                      }}
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      style={{
                        height: 56,
                        width: 56,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 8,
                        border: "1px solid var(--border, #ccc)",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                        opacity: 0.8,
                      }}
                    >
                      {attachment.kind.toUpperCase()}
                    </span>
                  )}
                  <span className="hint" style={{ flex: 1, minWidth: 0 }}>
                    {attachment.name}
                  </span>
                  <button type="button" className="ghost" onClick={clearAttachment}>
                    Remove
                  </button>
                </div>
              )}
              <p className="hint" style={{ marginTop: "0.4rem" }}>
                {isVisual
                  ? "Images and PDFs are also checked for whether the risk warning is prominent, not just present."
                  : "Word and text files are read as copy; images and PDFs also get a visual-prominence check."}
              </p>
            </div>

            <div className="actions">
              <button
                className="primary"
                onClick={() => check()}
                disabled={loading || !canCheck}
              >
                {loading && <span className="spinner" />}
                {loading ? "Checking…" : "Check compliance"}
              </button>
              {(result || copy.trim() || attachment) && (
                <button
                  type="button"
                  className="ghost"
                  onClick={startNewCopy}
                  disabled={loading}
                  title="Clear the box and start a new piece of copy (new usage session)"
                >
                  New copy
                </button>
              )}
              <span className="hint">{copy.trim().length} characters</span>
            </div>
          </div>
        </section>

        <aside className="info">
          <h2 className="info-title">What this checks</h2>
          <ul className="info-list">
            <li className="info-item">
              <span className="info-marker marker-error" aria-hidden="true" />
              <div>
                <p className="info-item-title">Prohibited content</p>
                <p className="info-item-desc">
                  “Risk-free” or guaranteed-return claims, superlatives, pressure
                  to act now, and other statements COBS 4.2 bars from crypto
                  promotions.
                </p>
              </div>
            </li>
            <li className="info-item">
              <span className="info-marker marker-warning" aria-hidden="true" />
              <div>
                <p className="info-item-title">Missing required elements</p>
                <p className="info-item-desc">
                  The prescribed FCA risk warning, the personalised-risk
                  warning, and any fee or cost disclosures the copy has to carry.
                </p>
              </div>
            </li>
            <li className="info-item">
              <span className="info-marker marker-warning" aria-hidden="true" />
              <div>
                <p className="info-item-title">Visual prominence (images &amp; PDFs)</p>
                <p className="info-item-desc">
                  When you upload an image or a designed PDF, it also checks the
                  risk warning is actually prominent: legible, sized, and not
                  buried in tiny grey text (COBS 4.12A.11R).
                </p>
              </div>
            </li>
          </ul>
          <p className="info-note">
            Ruleset drawn from COBS 4, the FCA cryptoasset financial-promotion
            rules &amp; guidance, GEN 4 and PRIN 2A. It pre-screens; your
            approver still signs off.
          </p>
        </aside>
      </div>

      {error && <div className="error">Error: {error}</div>}

      {result && (
        <Results
          key={checkId}
          result={result}
          promotion={checkedPromotion}
          draft={copy}
          medium={getMedium(medium)}
          editable={!checkedHadAttachment && copy.trim().length > 0}
          onApply={(next) => setCopy(next)}
          onRecheck={() => check()}
          mode={mode}
          priorTallies={priorTallies}
        />
      )}

      {result &&
        !checkedHadAttachment &&
        checkedPromotion &&
        result.overall_verdict !== "compliant" && (
          <Rewrites
            key={`rewrites-${checkId}`}
            copy={checkedPromotion}
            medium={getMedium(medium)}
            result={result}
            title={training ? "Now here’s what compliant looks like" : undefined}
            sub={
              training
                ? "Three compliant versions of your draft. Compare them against what you wrote: the gap between the two is the lesson."
                : undefined
            }
            onUse={(text) => {
              setCopy(text);
              document.getElementById("copy")?.scrollIntoView({ block: "center" });
              check(text);
            }}
          />
        )}

      {/* The usage panel measures rounds-to-clean on real copy. Training reps
          aren't part of that measurement. */}
      {!training && <UsagePanel tick={usageTick} />}

      <footer className="foot">
        {training
          ? "Practice against the real rulebook. Nothing in Training Mode is recorded, and no promotion is approved here."
          : "Compliance-style review to assist a human approver, not legal advice."}
        <br />
        Found a bug? Checker error?{" "}
        <Link className="foot-link" href="/support">
          Report a problem
        </Link>
        .
      </footer>
    </main>
  );
}
