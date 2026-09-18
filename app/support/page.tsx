"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import Logo from "@/app/components/Logo";

// Deliberately OUTSIDE the access gate. If a tester's code doesn't work, this
// is exactly when they need to reach us — a support form behind a broken gate
// is useless. Nothing here spends API tokens.

const SUPPORT_EMAIL = "support.61loi@simplelogin.com";
const LABEL_KEY = "sn_access_label";

const KINDS = [
  { value: "broken", label: "Something's broken" },
  { value: "verdict", label: "The checker got a verdict wrong" },
  { value: "idea", label: "Idea / feature request" },
  { value: "other", label: "Something else" },
] as const;

/** Coarse browser + OS, read from the UA string. Enough to spot "only breaks
 *  on Safari" without fingerprinting anyone. */
function readEnv(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  const browser =
    /Edg\/([\d.]+)/.exec(ua)?.[0] ??
    /OPR\/([\d.]+)/.exec(ua)?.[0] ??
    /Firefox\/([\d.]+)/.exec(ua)?.[0] ??
    /Chrome\/([\d.]+)/.exec(ua)?.[0] ??
    (/Safari/.test(ua) ? /Version\/([\d.]+)/.exec(ua)?.[0] ?? "Safari" : null) ??
    "unknown browser";
  const os = /Mac OS X/.test(ua)
    ? "macOS"
    : /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Linux/.test(ua)
    ? "Linux"
    : "unknown OS";
  return `${browser} on ${os} · ${window.innerWidth}×${window.innerHeight}`;
}

export default function Support() {
  const [kind, setKind] = useState<string>(KINDS[0].value);
  const [what, setWhat] = useState("");
  const [expected, setExpected] = useState("");
  const [promo, setPromo] = useState("");
  const [email, setEmail] = useState("");
  const [botField, setBotField] = useState("");

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-attached context. Resolved on the client only (needs navigator +
  // localStorage), so it starts empty and fills in after mount.
  const [tester, setTester] = useState("");
  const [env, setEnv] = useState("");

  useEffect(() => {
    // Re-read on resize: the string includes the viewport, and a report should
    // describe the window the tester is actually looking at, not the one they
    // happened to land on. It's also what the disclosure line below promises.
    const sync = () => setEnv(readEnv());
    sync();
    window.addEventListener("resize", sync);
    try {
      // The LABEL (user1), never the access code itself.
      setTester(localStorage.getItem(LABEL_KEY) || "not signed in");
    } catch {
      setTester("unknown");
    }
    return () => window.removeEventListener("resize", sync);
  }, []);

  const canSend = what.trim().length > 0 && !sending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    setSending(true);
    setError(null);

    // Netlify records the submission against the static form in
    // /public/__forms.html — hence the urlencoded POST and the form-name key.
    const body = new URLSearchParams({
      "form-name": "support",
      "bot-field": botField,
      kind: KINDS.find((k) => k.value === kind)?.label ?? kind,
      what: what.trim(),
      expected: expected.trim(),
      promo: promo.trim(),
      email: email.trim(),
      tester,
      env,
      when: new Date().toISOString(),
      build: process.env.NEXT_PUBLIC_BUILD ?? "dev",
    });

    try {
      const res = await fetch("/__forms.html", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!res.ok) throw new Error(`Netlify returned ${res.status}`);
      setSent(true);
    } catch {
      // Never strand the report — fall back to the email address below.
      setError(
        "Couldn't send that. Please copy the email address below and send it to us directly. Sorry for the hassle."
      );
    } finally {
      setSending(false);
    }
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError(`Couldn't copy automatically. The address is ${SUPPORT_EMAIL}`);
    }
  }

  return (
    <main className="wrap">
      <header className="head">
        <div className="brand">
          <Logo />
          <ThemeToggle />
        </div>
        <h1>{sent ? "Thanks, that's with us" : "Report a problem"}</h1>
        <p className="sub">
          {sent
            ? "Your report has been sent. If you left an email address we'll come back to you; if it's urgent, the address below reaches us directly."
            : "Found a bug, or the checker called something wrong? Tell us here. It goes straight to the person who can fix it."}
        </p>
      </header>

      {sent ? (
        <section className="panel support-panel">
          <div className="editor support-done">
            <p className="support-done-note">
              Reports like this are what shape what gets built next, so thank
              you for taking the time.
            </p>
            <div className="actions">
              <Link href="/app" className="button-link primary">
                Back to the checker
              </Link>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setSent(false);
                  setWhat("");
                  setExpected("");
                  setPromo("");
                }}
              >
                Report something else
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="panel support-panel">
          {/* `.editor` is the app's card surface — same one the access gate uses. */}
          <form className="editor support-form" onSubmit={submit}>
            {/* Honeypot — hidden from people, catnip for bots. */}
            <p className="support-hp" aria-hidden="true">
              <label>
                Don&apos;t fill this in
                <input
                  name="bot-field"
                  tabIndex={-1}
                  autoComplete="off"
                  value={botField}
                  onChange={(e) => setBotField(e.target.value)}
                />
              </label>
            </p>

            <label className="support-label" htmlFor="kind">
              What kind of thing is this?
            </label>
            <select
              id="kind"
              className="field-input"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>

            <label className="support-label" htmlFor="what">
              What happened? <span className="support-req">required</span>
            </label>
            <textarea
              id="what"
              className="support-area"
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              placeholder="What you did, and what the app did back."
              rows={4}
            />

            <label className="support-label" htmlFor="expected">
              What did you expect instead?
            </label>
            <textarea
              id="expected"
              className="support-area"
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              placeholder="Optional, but it's often the fastest way to see what went wrong."
              rows={3}
            />

            <label className="support-label" htmlFor="promo">
              The copy you were checking
            </label>
            <textarea
              id="promo"
              className="support-area"
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              placeholder="Optional. Paste it here and we can reproduce the exact result you saw."
              rows={4}
            />
            <p className="support-hint">
              Only sent if you paste it. Nothing you check is collected
              automatically.
            </p>

            <label className="support-label" htmlFor="email">
              Your email
            </label>
            <input
              id="email"
              type="email"
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Optional, only so we can reply."
              autoComplete="email"
            />

            {error && <div className="error">{error}</div>}

            <div className="actions">
              <button type="submit" className="primary" disabled={!canSend}>
                {sending && <span className="spinner" />}
                {sending ? "Sending…" : "Send report"}
              </button>
              <Link href="/app" className="button-link ghost">
                Cancel
              </Link>
            </div>

            <p className="support-auto">
              Attached automatically so you don&apos;t have to type it:{" "}
              <code>{tester || "…"}</code> <span aria-hidden="true">·</span>{" "}
              <code>{env || "…"}</code> <span aria-hidden="true">·</span>{" "}
              <code>{process.env.NEXT_PUBLIC_BUILD ?? "dev"}</code>
            </p>
          </form>
        </section>
      )}

      <section className="support-alt">
        <h2 className="support-alt-title">Prefer email?</h2>
        <p className="support-alt-note">
          No mail app required. Copy the address and use it wherever you read
          your email.
        </p>
        <div className="support-alt-row">
          <code className="support-email">{SUPPORT_EMAIL}</code>
          <button type="button" className="ghost" onClick={copyEmail}>
            {copied ? "Copied" : "Copy"}
          </button>
          <a
            className="button-link ghost"
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
              "StableNarrative checker support"
            )}`}
          >
            Open mail app
          </a>
        </div>
      </section>

      <footer className="foot">
        Compliance-style review to assist a human approver, not legal advice.
      </footer>
    </main>
  );
}
