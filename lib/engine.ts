// ============================================================================
// THE ENGINE — the ONE place to swap in the real Claude API call later.
//
// `runCheck` is the only function the rest of the app calls. Today it delegates
// to a local heuristic STUB so the app runs end-to-end with NO API key.
//
// To go live: set USE_STUB = false and provide ANTHROPIC_API_KEY in .env.local.
// `callClaude` below is already written against the real Messages API and the
// curated ruleset in ruleset.ts — flipping the flag is the whole swap.
// ============================================================================

import { CheckResult, Flag, MissingElement, Verdict } from "./types";
import { PRESCRIBED_RISK_WARNING, SYSTEM_PROMPT } from "./ruleset";

// The stub scans ONLY high-signal safety/reassurance words — the ones whose
// breach doesn't depend on surrounding context. Generic adjectives from the full
// banned list (best, most, easy, quick, instant, simplify, cheap, fast) are left
// out here: bare-substring matching on them causes false positives ("best to
// check", "most people") — exactly the trap golden-set Case 9/10 guard against.
// Superlatives are caught by SUPERLATIVE_PATTERNS instead. The real engine
// (ruleset.ts) judges the full list in context.
const STUB_SCAN_WORDS = [
  "safe",
  "secure",
  "guarantee",
  "guaranteed",
  "protect",
  "protected",
  "safeguard",
  "risk-free",
  "compliant",
  "trust",
] as const;

// ── The switch. Flip to false once ANTHROPIC_API_KEY is set. ────────────────
const USE_STUB = true;

export async function runCheck(input: string): Promise<CheckResult> {
  const text = input.trim();
  if (!text) {
    return {
      overall_verdict: "compliant",
      flags: [],
      missing_required: [],
      compliant_rewrite: "",
    };
  }
  return USE_STUB ? stubEngine(text) : callClaude(text);
}

// ============================================================================
// REAL ENGINE — one structured Claude call (approach A). Not active yet.
// This is the entire "swap in the real API" surface.
// ============================================================================
async function callClaude(input: string): Promise<CheckResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Check this UK crypto marketing copy for FCA financial-promotion compliance. Return ONLY the JSON.\n\n---\n${input}\n---`,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const raw: string = data?.content?.[0]?.text ?? "";
  const jsonStr = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  const parsed = JSON.parse(jsonStr) as CheckResult;
  return parsed;
}

// ============================================================================
// STUB ENGINE — deterministic local heuristic, no API key required.
//
// This is NOT the compliance brain — it's a lightweight stand-in that scans for
// the highest-signal breaches so the shell demonstrates end-to-end on any pasted
// copy. The curated ruleset (ruleset.ts) is what the real Claude call uses.
// Everything below gets deleted the day USE_STUB flips to false.
// ============================================================================

const URGENCY_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /don'?t miss out/i, label: "Don't miss out" },
  { re: /before the next bull run/i, label: "before the next bull run" },
  { re: /limited time/i, label: "limited time" },
  { re: /prices? (are )?rising/i, label: "prices are rising" },
  { re: /act now|hurry|last chance/i, label: "act now / hurry" },
];

const INCENTIVE_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /cashback/i, label: "cashback" },
  { re: /free crypto|free tokens?/i, label: "free crypto" },
  { re: /sign-?up bonus|referral bonus|welcome bonus/i, label: "sign-up bonus" },
];

const SUPERLATIVE_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\bbest rates?\b/i, label: "best rates" },
  { re: /most-?audited/i, label: "most-audited" },
  { re: /\bthe most\b/i, label: "the most" },
];

function findQuote(text: string, matchIndex: number, matchLen: number): string {
  // Return the sentence/line containing the match, trimmed, for a readable quote.
  const start = Math.max(
    text.lastIndexOf("\n", matchIndex),
    text.lastIndexOf(".", matchIndex),
    -1
  );
  let end = text.indexOf("\n", matchIndex + matchLen);
  const dot = text.indexOf(".", matchIndex + matchLen);
  if (dot !== -1 && (dot < end || end === -1)) end = dot;
  if (end === -1) end = text.length;
  return text.slice(start + 1, end).trim();
}

// The prescribed risk warning legitimately contains "protected" ("should not
// expect to be protected…"). Mask it before the banned-word scan so the tool
// doesn't flag the very warning it requires.
const RISK_WARNING_RE =
  /don['’]?t invest unless you['’]?re prepared to lose all the money you invest\.?\s*this is a high-risk investment and you should not expect to be protected if something goes wrong\.?/i;

function stubEngine(text: string): CheckResult {
  const flags: Flag[] = [];
  const seen = new Set<string>();
  const lower = text.toLowerCase();
  // Used only for the banned-word scan (indices don't matter — we quote the word itself).
  const scanSource = text.replace(RISK_WARNING_RE, " ");

  const push = (f: Flag) => {
    const key = f.quote + "|" + f.rule;
    if (!seen.has(key)) {
      seen.add(key);
      flags.push(f);
    }
  };

  // 1. Banned / caution words (COBS 4.2.5G) — high-signal safety words only.
  for (const word of STUB_SCAN_WORDS) {
    const re = new RegExp(`\\b${word.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
    const m = re.exec(scanSource);
    if (m && m.index !== undefined) {
      const isSafety = /safe|secur|guarant|protect|risk-free|safeguard/i.test(word);
      push({
        quote: m[0],
        rule: "Banned/caution word — COBS 4.2.5G",
        issue: `"${m[0]}" is a restricted word implying safety/reassurance; it needs substantiation and balancing risk info to stay fair, clear and not misleading (judged on the impression on a retail consumer).`,
        severity: isSafety ? "high" : "medium",
      });
    }
  }

  // 3. Superlatives / unsubstantiated claims (COBS 4.2.1R) — distinct from 4.2.5G.
  for (const p of SUPERLATIVE_PATTERNS) {
    const m = p.re.exec(text);
    if (m && m.index !== undefined) {
      push({
        quote: findQuote(text, m.index, m[0].length),
        rule: "Unsubstantiated superlative — COBS 4.2.1R (fair, clear, not misleading)",
        issue: `"${m[0]}" is a bald superlative/comparative claim that can't realistically be continuously evidenced. This is a fair-clear-not-misleading defect, NOT a banned-word issue.`,
        severity: "high",
      });
    }
  }

  // 4. Urgency / FOMO (COBS 4.2.1R; Finalised Guidance).
  for (const p of URGENCY_PATTERNS) {
    const m = p.re.exec(text);
    if (m && m.index !== undefined) {
      push({
        quote: findQuote(text, m.index, m[0].length),
        rule: "Urgency / FOMO — COBS 4.2.1R; Finalised Guidance",
        issue: "Creates false urgency / fear of missing out, pressuring a retail consumer into a high-risk decision.",
        severity: "medium",
      });
    }
  }

  // 5. Incentives ban (COBS 4.12A.7R) — must be REMOVED, not reworded.
  for (const p of INCENTIVE_PATTERNS) {
    const m = p.re.exec(text);
    if (m && m.index !== undefined) {
      push({
        quote: findQuote(text, m.index, m[0].length),
        rule: "Banned incentive — COBS 4.12A.7R / 4.12A.8G(3)",
        issue: `"${p.label}" is a prohibited monetary incentive to retail clients. It applies even where no purchase is required — this must be REMOVED from the promotion, not reworded.`,
        severity: "high",
      });
    }
  }

  // ── Missing required elements ──────────────────────────────────────────────
  const missing: MissingElement[] = [];
  const hasRiskWarning =
    lower.includes("don't invest unless you're prepared to lose") ||
    lower.includes("dont invest unless youre prepared to lose") ||
    lower.includes("prepared to lose all the money you invest");

  const looksPromotional =
    flags.length > 0 ||
    /\b(buy|get|swap|stake|invest|own|acquire|earn|trade|borrow|spend)\b/i.test(text);

  // Very rough "is this a financial promotion?" guard for the stub.
  const looksFactualOnly =
    !looksPromotional &&
    /\b(tax|how (are|much)|fees? (are|vary)|generally|consult|regulations?)\b/i.test(text);

  if (looksPromotional && !hasRiskWarning) {
    missing.push({
      element: "Risk warning (COBS 4.12A.11R(1)(c))",
      requirement:
        `Every cryptoasset financial promotion must carry, verbatim: "${PRESCRIBED_RISK_WARNING}" (with a "Take 2 mins to learn more" link to the risk summary).`,
      why: "No prescribed FCA risk warning is present in the copy.",
    });

    const mentionsSafetyOrReg = /safe|secur|protect|compliant|trust/i.test(text);
    if (mentionsSafetyOrReg) {
      missing.push({
        element: "Unregulated-status statement",
        requirement:
          "Where safety/reassurance is implied, the copy must make clear the cryptoasset is high-risk and largely unregulated, with no FSCS or Financial Ombudsman protection.",
        why: "The copy implies safety/reassurance but omits any statement that the asset is unregulated and capital is at risk.",
      });
    }
  }

  // Fee/cost disclosure — only when a fee-bearing product is actually promoted
  // (gated on looksPromotional so factual FAQs mentioning "cards"/"fees" don't trip it).
  const promotesFeeBearingProduct = /\b(borrow|cashback|swap|best rates?)\b/i.test(text) ||
    /\b(spend|use)\b.*\bcard\b/i.test(text);
  const disclosesFees = /see (the )?(full )?(fees?|pricing|terms)|fees? apply/i.test(text);
  if (looksPromotional && promotesFeeBearingProduct && !disclosesFees) {
    missing.push({
      element: "Fees / charges / costs",
      requirement:
        "Copy promoting a fee-bearing product (swaps, cards, borrowing, 'best rates') must disclose the relevant fees, spreads, and costs.",
      why: "A fee-bearing product is promoted with no cost/fee disclosure.",
    });
  }

  // ── Verdict ────────────────────────────────────────────────────────────────
  let verdict: Verdict;
  if (looksFactualOnly && flags.length === 0) {
    verdict = "compliant";
  } else if (flags.length === 0 && missing.length === 0) {
    verdict = "compliant";
  } else {
    verdict = "non_compliant";
  }

  // ── Rewrite ────────────────────────────────────────────────────────────────
  let rewrite: string;
  if (verdict === "compliant" && looksFactualOnly) {
    rewrite = "No change required — factual content, not a financial promotion.";
  } else if (verdict === "compliant") {
    rewrite = "N/A — already compliant.";
  } else {
    const hasIncentive = INCENTIVE_PATTERNS.some((p) => p.re.test(text));
    rewrite =
      `**${PRESCRIBED_RISK_WARNING} Take 2 mins to learn more.**\n\n` +
      `[Compliant rewrite — STUB] This heuristic stub flags breaches but does not generate full replacement copy. ` +
      `The live engine (curated ruleset) rewrites the whole input: it leads with the risk warning above, replaces restricted words ` +
      `with substantiated language, adds balancing capital-at-risk and unregulated-status statements, and discloses fees where relevant.` +
      (hasIncentive
        ? `\n\nNote: the banned incentive above cannot be reworded into compliance — it must be REMOVED from any promotion reaching UK retail clients (COBS 4.12A.7R).`
        : "");
  }

  return {
    overall_verdict: verdict,
    flags,
    missing_required: missing,
    compliant_rewrite: rewrite,
  };
}
