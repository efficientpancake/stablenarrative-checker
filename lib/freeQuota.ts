// ============================================================================
// FREE-TRIAL QUOTA: the limit that survives clearing your browser.
//
// The five-check count in lib/freeTrial.ts lives in the visitor's own storage,
// so clearing it grants five more. This one is counted on the server, in
// Netlify Blobs (the site's own key/value store, no extra service to run), and
// keyed two ways:
//
//   • by email, because that is who the trial belongs to;
//   • by connection address, because email is unverified and free to make up.
//
// Both reset daily. Neither is airtight: a VPN changes the address and a
// throwaway inbox changes the email. They stop the cheap attacks (clear
// storage and repeat, or script the endpoint), and the spend cap on the API
// key in the Anthropic Console is the ceiling that nothing gets past.
//
// Failure is deliberately OPEN. If the store is unreachable (local dev, an
// outage) the check still runs: a visitor evaluating the product must never
// see an error because a counter was unavailable. The spend cap still holds.
// ============================================================================

import { getStore } from "@netlify/blobs";

/** Per email per day. Matches the five-check browser trial, so an honest
 *  visitor who clears their storage gets no more than they started with. */
export const EMAIL_DAILY_LIMIT = 5;
/** Per connection address per day. Higher than the email limit because an
 *  office or a café shares one address between real people. */
export const IP_DAILY_LIMIT = 10;

/** Rewrites are cheaper than checks and a visitor may ask for several per
 *  check, so they get their own, roomier bucket rather than eating the
 *  check allowance. */
export const REWRITE_DAILY_LIMIT = 15;

const STORE_NAME = "free-trial-quota";

/** The minimal slice of a Netlify Blobs store this file uses, so a test can
 *  pass a fake one in. */
export interface QuotaStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
}

export interface QuotaResult {
  ok: boolean;
  /** Which limit stopped it, for the message the visitor sees. */
  hit?: "email" | "ip";
  /** True when the store could not be reached, so nothing was counted. */
  unavailable?: boolean;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Read, compare, write. Two requests landing in the same millisecond can both
 *  read the same count, so the limit can be exceeded by one or two under load.
 *  That is a fair trade for not running a database. */
async function bump(
  store: QuotaStore,
  key: string,
  limit: number
): Promise<boolean> {
  const raw = await store.get(key);
  const count = Number(raw ?? "0");
  const used = Number.isFinite(count) && count > 0 ? count : 0;
  if (used >= limit) return false;
  await store.set(key, String(used + 1));
  return true;
}

/** Count one free check against both limits. Exported with the store injected
 *  so it can be tested without Netlify. */
export async function spendQuota(
  store: QuotaStore,
  email: string,
  ip: string
): Promise<QuotaResult> {
  const day = today();
  if (email) {
    const ok = await bump(store, `email:${email.toLowerCase()}:${day}`, EMAIL_DAILY_LIMIT);
    if (!ok) return { ok: false, hit: "email" };
  }
  if (ip) {
    const ok = await bump(store, `ip:${ip}:${day}`, IP_DAILY_LIMIT);
    if (!ok) return { ok: false, hit: "ip" };
  }
  return { ok: true };
}

/** Rewrites, counted separately (see REWRITE_DAILY_LIMIT). */
export async function spendRewriteQuota(
  store: QuotaStore,
  email: string,
  ip: string
): Promise<QuotaResult> {
  const day = today();
  if (email) {
    const ok = await bump(store, `rw-email:${email.toLowerCase()}:${day}`, REWRITE_DAILY_LIMIT);
    if (!ok) return { ok: false, hit: "email" };
  }
  if (ip) {
    const ok = await bump(store, `rw-ip:${ip}:${day}`, REWRITE_DAILY_LIMIT * 2);
    if (!ok) return { ok: false, hit: "ip" };
  }
  return { ok: true };
}

/** The live path: same thing against the site's Blobs store. Never throws. */
export async function spendFreeQuota(
  email: string,
  ip: string,
  kind: "check" | "rewrite" = "check"
): Promise<QuotaResult> {
  try {
    const store = getStore(STORE_NAME) as unknown as QuotaStore;
    return kind === "rewrite"
      ? await spendRewriteQuota(store, email, ip)
      : await spendQuota(store, email, ip);
  } catch {
    // No Blobs here (local dev, or an outage). Let it through: a visitor
    // evaluating the product must never meet an error from a counter.
    return { ok: true, unavailable: true };
  }
}

/** What the visitor is told. Never says which limit, only what to do next. */
export function quotaMessage(hit: "email" | "ip"): string {
  return hit === "email"
    ? "That's today's free checks for this email. Book a 15-minute call and we'll set you up with your own access."
    : "This network has used today's free checks. Book a 15-minute call and we'll set you up with your own access.";
}

/** Netlify puts the real client address here; the others are fallbacks for
 *  other hosts and local dev. */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-nf-client-connection-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    ""
  );
}
