import { NextRequest, NextResponse } from "next/server";
import { runCheck } from "@/lib/engine";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { copy } = await req.json();
    if (typeof copy !== "string") {
      return NextResponse.json(
        { error: "Body must be { copy: string }" },
        { status: 400 }
      );
    }
    const result = await runCheck(copy);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
