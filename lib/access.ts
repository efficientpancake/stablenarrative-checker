// ============================================================================
// ACCESS CONTROL — maps a per-tester access code to that tester's API key.
//
// Config lives ENTIRELY in environment variables (set in Netlify), never in the
// repo or the client bundle. For each tester N, set a matching pair:
//   CODE_USER1 = <the code you give tester 1>
//   ANTHROPIC_KEY_USER1 = <tester 1's own Anthropic API key>
// Add USER2, USER3, … the same way. Usage then splits by key in the Console.
//
// If NO CODE_USERn pairs are set, the app is UNGATED and falls back to the
// single ANTHROPIC_API_KEY (local dev / pre-gate). Presence of any pair turns
// the gate on — there is deliberately NO default key when gated, so a missing
// or wrong code can never be silently attributed to the wrong tester.
// ============================================================================

export interface AccessUser {
  label: string; // "user1", "user2" — never a real name
  code: string;
  key: string;
}

export function readUsers(): AccessUser[] {
  const users: AccessUser[] = [];
  for (let i = 1; i <= 20; i++) {
    const code = process.env[`CODE_USER${i}`];
    const key = process.env[`ANTHROPIC_KEY_USER${i}`];
    if (code && key) users.push({ label: `user${i}`, code, key });
  }
  return users;
}

export interface Resolved {
  key?: string;
  label?: string;
  gated: boolean;
  /** "required" (no code given) | "invalid" (code didn't match) — only when gated and unresolved. */
  reason?: "required" | "invalid";
}

/** The free trial's key. A visitor from the landing page has no code and no
 *  key of their own, so these checks are paid for by StableNarrative: set
 *  FREE_TRIAL_KEY in Netlify to keep that spend on its own key in the Console.
 *  Falls back to the shared key so local dev works without extra config. */
export function resolveFreeTrial(): Resolved {
  const key = process.env.FREE_TRIAL_KEY ?? process.env.ANTHROPIC_API_KEY;
  return { key, label: "free", gated: false };
}

/** Resolve an incoming code to the right API key, or explain why it can't. */
export function resolveAccess(code: string | null | undefined): Resolved {
  const users = readUsers();

  // Ungated: no per-tester config → use the single shared key.
  if (users.length === 0) {
    return { key: process.env.ANTHROPIC_API_KEY, label: "default", gated: false };
  }

  const trimmed = (code ?? "").trim();
  if (!trimmed) return { gated: true, reason: "required" };

  const match = users.find((u) => u.code === trimmed);
  if (!match) return { gated: true, reason: "invalid" };

  return { key: match.key, label: match.label, gated: true };
}
