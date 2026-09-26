// ============================================================================
// FREE TRIAL: the "Try it free" path from the landing page.
//
// Testers have a code that maps to their OWN Anthropic key (lib/access.ts).
// A visitor arriving from the landing page has neither, so their checks are
// paid for out of StableNarrative's own key. That makes the cap a cost control,
// not a product decision: five checks is enough to paste real copy, read the
// flags, apply a fix and re-check, which is the whole point of the demo.
//
// The count lives in this browser, so it is a courtesy limit, not security.
// The server-side guards that actually bound the spend are in
// app/api/check/route.ts: a free request gets no file uploads (an image or PDF
// costs several times a text check) and a shorter copy limit.
// ============================================================================

/** Free checks per browser before the call-booking prompt replaces the button. */
export const FREE_LIMIT = 5;

const USED_KEY = "sn_free_used";
/** Set once a visitor arrives with ?free=1, so a refresh keeps them unlocked. */
const FLAG_KEY = "sn_free_mode";

/** Header the client sends instead of an access code. */
export const FREE_HEADER = "x-free-trial";
/** The email the visitor gave to start their trial. Not verified: it is a
 *  speed bump plus a lead, not authentication. */
export const FREE_EMAIL_HEADER = "x-free-email";

const EMAIL_KEY = "sn_free_email";

export function freeEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setFreeEmail(email: string): void {
  try {
    localStorage.setItem(EMAIL_KEY, email);
  } catch {
    /* storage blocked: they will be asked again on the next page load */
  }
}

/** Deliberately loose: enough to catch a typo, never enough to reject a real
 *  address. Anything stricter fails on valid addresses more often than it
 *  stops anyone. */
export function looksLikeEmail(value: string): boolean {
  const v = value.trim();
  return v.length > 4 && v.length < 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function isFreeMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("free") === "1") {
      localStorage.setItem(FLAG_KEY, "1");
      return true;
    }
    return localStorage.getItem(FLAG_KEY) === "1";
  } catch {
    // Storage blocked (private window): still allow the trial for this page.
    return new URLSearchParams(window.location.search).get("free") === "1";
  }
}

export function freeUsed(): number {
  if (typeof window === "undefined") return 0;
  try {
    const n = Number(localStorage.getItem(USED_KEY) ?? "0");
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function freeLeft(): number {
  return Math.max(0, FREE_LIMIT - freeUsed());
}

/** Count one check. Returns the number left afterwards. */
export function recordFreeCheck(): number {
  const next = freeUsed() + 1;
  try {
    localStorage.setItem(USED_KEY, String(next));
  } catch {
    /* storage blocked: the server-side guards still apply */
  }
  return Math.max(0, FREE_LIMIT - next);
}

/** Leaves free mode, e.g. when a tester enters a real code later. */
export function clearFreeMode(): void {
  try {
    localStorage.removeItem(FLAG_KEY);
  } catch {
    /* nothing to clear */
  }
}
