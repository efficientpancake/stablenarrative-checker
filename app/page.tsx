"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckResult } from "@/lib/types";
import Results from "./components/Results";
import ThemeToggle from "./components/ThemeToggle";

const STORAGE_KEY = "sn_access_code";
// The tester's LABEL ("user1"), stored so a support report can say who sent it.
// Deliberately separate from the code: the code unlocks an API key and must
// never leave this device; the label identifies without granting anything.
const LABEL_KEY = "sn_access_label";

const EXAMPLE = `Own uranium on-chain with xU3O8. A safe, guaranteed store of value backed by real assets.
Don't miss out — get in before the next bull run.`;

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
      setGateError("Something went wrong — please try again.");
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
      setError("File is too large — please keep it under 4 MB.");
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

  async function check() {
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
        body: JSON.stringify({ copy, file }),
      });
      const data = await res.json();
      if (res.status === 401) {
        // Code no longer valid (e.g. rotated) — send them back to the gate.
        localStorage.removeItem(STORAGE_KEY);
        setUnlocked(false);
        throw new Error("Please re-enter your access code.");
      }
      if (!res.ok) throw new Error(data.error || "Check failed");
      setResult(data as CheckResult);
      setCheckedPromotion(
        copy.trim()
          ? copy.trim()
          : attachment
          ? `[Attached ${attachment.kind}: ${attachment.name}]`
          : ""
      );
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
            <span className="brand-name">StableNarrative</span>
            <span className="badge">LIVE</span>
            <ThemeToggle />
          </div>
          <h1>Enter your access code</h1>
          <p className="sub">
            This checker is private. Enter the access code you were given to
            continue — you’ll only need to do this once on this device.
          </p>
        </header>
        <section className="panel" style={{ maxWidth: 440 }}>
          <form onSubmit={submitGate} className="editor">
            <input
              type="text"
              value={gateInput}
              onChange={(e) => setGateInput(e.target.value)}
              placeholder="Access code"
              autoFocus
              autoComplete="off"
              style={{
                width: "100%",
                padding: "0.7rem 0.85rem",
                borderRadius: 10,
                border: "1px solid var(--border, #ccc)",
                background: "transparent",
                color: "inherit",
                fontSize: "1rem",
                fontFamily: "inherit",
              }}
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
    <main className="wrap">
      <header className="head">
        <div className="brand">
          <span className="brand-name">StableNarrative</span>
          <span className="badge">LIVE</span>
          <ThemeToggle />
        </div>
        <h1>FCA compliance check for UK crypto marketing copy</h1>
        <p className="sub">
          Paste your copy or upload the promotion — image, PDF, Word, or text.
          It gets checked against FCA financial-promotion rules — prohibited
          content, missing required elements, visual prominence of the risk
          warning, and a compliant rewrite — before it reaches your s21
          approver. This tool pre-cleans; the human approver always signs off.
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
              placeholder="Paste the tweet, landing-page hero, ad, or CTA here — or attach a file below…"
              rows={10}
            />

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
                  ? "Images and PDFs are also checked for whether the risk warning is prominent — not just present."
                  : "Word and text files are read as copy; images and PDFs also get a visual-prominence check."}
              </p>
            </div>

            <div className="actions">
              <button
                className="primary"
                onClick={check}
                disabled={loading || !canCheck}
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
              <span className="info-marker marker-warning" aria-hidden="true" />
              <div>
                <p className="info-item-title">Visual prominence (images &amp; PDFs)</p>
                <p className="info-item-desc">
                  When you upload an image or a designed PDF, it also checks the
                  risk warning is actually prominent — legible, sized, and not
                  buried in tiny grey text (COBS 4.12A.11R).
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

      {result && <Results result={result} promotion={checkedPromotion} />}

      <footer className="foot">
        Compliance-style review to assist a human approver — not legal advice.
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
