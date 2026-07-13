"use client";

import { useRef, useState } from "react";
import { CheckResult } from "@/lib/types";
import Results from "./components/Results";
import ThemeToggle from "./components/ThemeToggle";

const EXAMPLE = `Own uranium on-chain with xU3O8. A safe, guaranteed store of value backed by real assets.
Don't miss out — get in before the next bull run.`;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Read a File as base64 (without the data: prefix) for the API. */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read the image file"));
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [copy, setCopy] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Unsupported image type — use PNG, JPG, GIF, or WebP.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image is too large — please keep it under 5 MB.");
      return;
    }
    setError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function check() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const image = imageFile
        ? { data: await fileToBase64(imageFile), mediaType: imageFile.type }
        : undefined;
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ copy, image }),
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

  const canCheck = copy.trim().length > 0 || imageFile !== null;

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
          Paste your copy or upload the promotion image. It gets checked against
          FCA financial-promotion rules — prohibited content, missing required
          elements, visual prominence of the risk warning, and a compliant
          rewrite — before it reaches your s21 approver. This tool pre-cleans;
          the human approver always signs off.
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

            <div className="attach">
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={onPickImage}
                style={{ display: "none" }}
              />
              {!imageFile ? (
                <button
                  type="button"
                  className="ghost"
                  onClick={() => fileInput.current?.click()}
                >
                  + Upload promotion image
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview ?? ""}
                    alt="Promotion preview"
                    style={{
                      height: 56,
                      width: 56,
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "1px solid var(--border, #ccc)",
                    }}
                  />
                  <span className="hint" style={{ flex: 1, minWidth: 0 }}>
                    {imageFile.name}
                  </span>
                  <button type="button" className="ghost" onClick={clearImage}>
                    Remove
                  </button>
                </div>
              )}
              <p className="hint" style={{ marginTop: "0.4rem" }}>
                Checking an image also assesses whether the risk warning is
                prominent — not just present.
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
                <p className="info-item-title">Visual prominence (images)</p>
                <p className="info-item-desc">
                  When you upload an image, it also checks the risk warning is
                  actually prominent — legible, sized, and not buried in tiny
                  grey text (COBS 4.12A.11R).
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
