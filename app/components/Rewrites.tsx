"use client";

import { useState } from "react";
import { CheckResult, RewriteOption, RewriteResult, Tone } from "@/lib/types";
import { Medium } from "@/lib/medium";

// Same key the page stores the access code under. The code picks the tester's
// API key on the server and never leaves this device otherwise.
const STORAGE_KEY = "sn_access_code";

/** Rohan asked for three options "based on tone and level of compliance".
 *  All three are compliant; they differ only in how much marketing voice they
 *  keep. Offering a less-compliant option in a compliance tool would be the
 *  wrong signal. */
const TONE_COPY: Record<Tone, { label: string; desc: string }> = {
  careful: {
    label: "Careful",
    desc: "The most conservative. The easiest for your approver to sign off.",
  },
  balanced: {
    label: "Balanced",
    desc: "Compliant and still persuasive. What most marketers would ship.",
  },
  bold: {
    label: "Bold",
    desc: "The most marketing energy the rules allow.",
  },
};

/**
 * "Want a clean version?" Three compliant rewrites, on demand only, so an
 * ordinary check costs what it always did. Picking one puts it in the draft
 * and runs the check again: no rewrite reaches an approver unchecked, and the
 * approver still signs off.
 */
export default function Rewrites({
  copy,
  medium,
  result,
  onUse,
  title = "Want a clean version?",
  sub,
}: {
  /** Training calls this "what compliant looks like": same rewrites, taught. */
  title?: string;
  sub?: string;
  /** The copy that was checked. */
  copy: string;
  /** Where it's going: sets the warning and the length limit. */
  medium: Medium;
  /** The check's findings, so the rewrite fixes exactly those. */
  result: CheckResult;
  /** Put the chosen rewrite in the draft and check it again. */
  onUse: (text: string) => void;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [data, setData] = useState<RewriteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function suggest() {
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-access-code": localStorage.getItem(STORAGE_KEY) ?? "",
        },
        body: JSON.stringify({
          copy,
          medium: medium.id,
          flags: result.flags.map((f) => ({ quote: f.quote, rule: f.rule, issue: f.issue })),
          missing: result.missing_required.map((m) => ({
            element: m.element,
            requirement: m.requirement,
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't write the rewrites.");
      setData(body as RewriteResult);
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setState("error");
    }
  }

  return (
    <section className="rewrites" aria-labelledby="rewrites-title">
      <h2 id="rewrites-title" className="rewrites-title">
        {title}
      </h2>
      <p className="rewrites-sub">
        {sub ??
          `Get three compliant rewrites for a ${medium.noun}. They differ in how much marketing voice they keep. Whichever you pick goes into your draft and gets checked again.`}
      </p>

      {(state === "idle" || state === "error") && (
        <button type="button" className="primary" onClick={suggest}>
          Suggest rewrites
        </button>
      )}

      {state === "loading" && (
        <p className="rewrites-loading" role="status">
          <span className="spinner spinner-ink" aria-hidden="true" />
          Writing three versions. This takes a little longer than a check.
        </p>
      )}

      {error && <div className="error">{error}</div>}

      {state === "done" && data?.cannot_fit && (
        <div className="rewrites-cannot" role="status">
          <p className="rewrites-cannot-title">
            No compliant version fits a {medium.noun}
          </p>
          <p className="rewrites-cannot-body">{data.cannot_fit}</p>
        </div>
      )}

      {state === "done" && data && data.options.length > 0 && (
        <ul className="rewrite-list">
          {data.options.map((o) => (
            <RewriteCard key={o.tone} option={o} medium={medium} onUse={() => onUse(o.text)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RewriteCard({
  option,
  medium,
  onUse,
}: {
  option: RewriteOption;
  medium: Medium;
  onUse: () => void;
}) {
  const tone = TONE_COPY[option.tone];
  const chars = option.text.length;
  return (
    <li className="rewrite-card">
      <div className="rewrite-head">
        <span className="rewrite-tone">{tone.label}</span>
        <span className="rewrite-desc">{tone.desc}</span>
      </div>
      <div className="rewrite-text">{option.text}</div>
      {option.note && (
        <p className="rewrite-note">
          <strong>Also needed:</strong> {option.note}
        </p>
      )}
      <div className="rewrite-foot">
        <span className="hint">
          {chars} characters{medium.maxChars ? ` of ${medium.maxChars}` : ""}
        </span>
        <button type="button" className="primary" onClick={onUse}>
          Use this
        </button>
      </div>
    </li>
  );
}
