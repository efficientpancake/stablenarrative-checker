import { NextRequest, NextResponse } from "next/server";
import { runRewrite } from "@/lib/engine";
import { resolveAccess, resolveFreeTrial } from "@/lib/access";
import { FREE_HEADER } from "@/lib/freeTrial";
import { getMedium } from "@/lib/medium";

export const runtime = "nodejs";

// Three compliant rewrites on demand (Phase 3). Only ever called when a tester
// clicks "Suggest rewrites", so ordinary checks cost exactly what they did.
//
// Sonnet 5 standard rates (USD per 1M tokens) and conversion, the same figures
// cost-check.ts uses. Only used to log what each rewrite actually cost.
const RATE_IN = 3.0;
const RATE_OUT = 15.0;
const USD_TO_GBP = 0.78;

/** A long blog post is a few thousand characters; this stops abuse, not use. */
const MAX_COPY = 12000;

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

function asText(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function POST(req: NextRequest) {
  try {
    // Same gate as /api/check: the access code picks this tester's API key.
    const free = req.headers.get(FREE_HEADER) === "1";
    const access = free ? resolveFreeTrial() : resolveAccess(req.headers.get("x-access-code"));
    if (access.gated && access.reason) {
      return NextResponse.json({ error: "Access code required." }, { status: 401 });
    }
    if (!access.key) {
      return NextResponse.json(
        { error: "Server is missing its API key configuration." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const copy = asText(body.copy).trim();
    if (!copy) return bad("Provide the copy to rewrite.");
    if (copy.length > MAX_COPY) return bad("That copy is too long to rewrite in one go.");

    const medium = getMedium(body.medium);
    const flags = (Array.isArray(body.flags) ? body.flags : [])
      .slice(0, 40)
      .map((f: Record<string, unknown>) => ({
        quote: asText(f?.quote),
        rule: asText(f?.rule),
        issue: asText(f?.issue),
      }))
      .filter((f: { quote: string; rule: string }) => f.quote || f.rule);
    const missing = (Array.isArray(body.missing) ? body.missing : [])
      .slice(0, 20)
      .map((m: Record<string, unknown>) => ({
        element: asText(m?.element),
        requirement: asText(m?.requirement),
      }))
      .filter((m: { element: string }) => m.element);

    const { result, usage, dropped } = await runRewrite(
      copy,
      medium,
      { flags, missing },
      access.key
    );

    // One structured line per rewrite: counts and cost, never the copy.
    const gbp = usage
      ? ((usage.input_tokens / 1e6) * RATE_IN + (usage.output_tokens / 1e6) * RATE_OUT) *
        USD_TO_GBP
      : null;
    console.log(
      JSON.stringify({
        evt: "rewrite",
        at: new Date().toISOString(),
        tester: access.label ?? "unknown",
        medium: medium.id,
        options: result.options.length,
        dropped,
        cannot_fit: !!result.cannot_fit,
        input_tokens: usage?.input_tokens ?? null,
        output_tokens: usage?.output_tokens ?? null,
        gbp: gbp === null ? null : Number(gbp.toFixed(4)),
      })
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
