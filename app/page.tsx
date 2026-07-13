"use client";

import { useState } from "react";
import { CheckResult } from "@/lib/types";
import Results from "./components/Results";
import ThemeToggle from "./components/ThemeToggle";

const EXAMPLE = `Own uranium on-chain with xU3O8. A safe, guaranteed store of value backed by real assets.
Don't miss out — get in before the next bull run.`;

export default function Home() {
  const [copy, setCopy] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ copy }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check failed");
      setResult(data as CheckResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="wrap">
      <header className="head">
        <div className="brand">
          <span className="brand-name">StableNarrative</span>
          <span className="badge">STUB ENGINE</span>
          <ThemeToggle />
        </div>
        <h1>FCA compliance check for UK crypto marketing copy</h1>
        <p className="sub">
          Paste your copy. It gets checked against FCA financial-promotion rules —
          prohibited content, missing required elements, and a compliant rewrite —
          before it reaches your s21 approver. This tool pre-cleans; the human
          approver always signs off.
        </p>
      </header>

      <div className="workspace">
        <section className="panel">
          <div className="editor">
            <div className="editor-top">
              <label htmlFor="copy">Marketing copy</label>
              <button
                type="button"
                className="ghost"
                onClick={() => setCopy(EXAMPLE)}
              >
                Load example
              </button>
            </div>
            <textarea
              id="copy"
              value={copy}
              onChange={(e) => setCopy(e.target.value)}
              placeholder="Paste the tweet, landing-page hero, ad, or CTA here…"
              rows={10}
            />
            <div className="actions">
              <button
                className="primary"
                onClick={check}
                disabled={loading || !copy.trim()}
              >
                {loading && <span className="spinner" />}
                {loading ? "Checking…" : "Check compliance"}
              </button>
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
              <span className="info-marker marker-success" aria-hidden="true" />
              <div>
                <p className="info-item-title">Compliant rewrite</p>
                <p className="info-item-desc">
                  A corrected version that keeps your message but clears the
                  rules — ready to hand to your s21 approver.
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

      {result && <Results result={result} />}

      <footer className="foot">
        Compliance-style review to assist a human approver — not legal advice.
      </footer>
    </main>
  );
}
