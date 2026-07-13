import { NextRequest, NextResponse } from "next/server";
import { resolveAccess } from "@/lib/access";

export const runtime = "nodejs";

// Lightweight probe the client calls on load and on code entry — it validates a
// code without spending any API tokens. Returns 200 always; the body says
// whether the app is gated and whether this code unlocks it.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code : null;
  const r = resolveAccess(code);

  if (!r.gated) return NextResponse.json({ ok: true, gated: false });
  if (r.reason) return NextResponse.json({ ok: false, gated: true, reason: r.reason });
  return NextResponse.json({ ok: true, gated: true, label: r.label });
}
