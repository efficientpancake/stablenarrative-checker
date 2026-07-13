"use client";

import { useState } from "react";
import { CheckResult, Severity, Verdict } from "@/lib/types";

const VERDICT_LABEL: Record<Verdict, string> = {
  non_compliant: "Non-compliant",
  compliant: "Compliant",
  needs_review: "Needs review",
};

export default function Results({ result }: { result: CheckResult }) {
  const { overall_verdict, flags, missing_required, compliant_rewrite } = result;

  return (
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
            {flags.map((f, i) => (
              <li key={i} className={`card sev-${f.severity}`}>
                <div className="card-head">
                  <SeverityPill severity={f.severity} />
                  <span className="rule">{f.rule}</span>
                </div>
                <blockquote>“{f.quote}”</blockquote>
                <p className="issue">{f.issue}</p>
              </li>
            ))}
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
            {missing_required.map((m, i) => (
              <li key={i} className="card sev-missing">
                <div className="card-head">
                  <span className="rule strong">{m.element}</span>
                </div>
                <p className="issue">
                  <strong>Required:</strong> {m.requirement}
                </p>
                <p className="issue">
                  <strong>Why flagged:</strong> {m.why}
                </p>
              </li>
            ))}
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
