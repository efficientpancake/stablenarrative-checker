import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { runCheck, Attachment } from "@/lib/engine";
import { resolveAccess, resolveFreeTrial } from "@/lib/access";
import { FREE_HEADER } from "@/lib/freeTrial";
import { getMedium } from "@/lib/medium";

export const runtime = "nodejs";

// Sonnet 5 vision accepts these image types.
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/** A long landing-page hero is ~1,500 characters; this bounds a free check
 *  without getting in the way of real copy. */
const FREE_MAX_CHARS = 3000;

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    // Gate first: the access code (sent as a header) picks this tester's API
    // key. When gated, a missing/wrong code is rejected — never silently run on
    // a default key, so every check is attributed to exactly one tester.
    // A free-trial visitor has no code: their checks run on StableNarrative's
    // own key, so they are bounded here (no file uploads, shorter copy) as
    // well as by the five-check count in the browser.
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
    let copy = typeof body.copy === "string" ? body.copy : "";
    // Where the copy is going decides which warning is required (a text post
    // takes the short form). Unknown or absent falls back to web, the fullest.
    const medium = getMedium(body.medium);
    // Training runs ask for the two teaching fields. Anything other than the
    // literal "training" is live, so a malformed client falls back to live.
    const mode = body.mode === "training" ? "training" : "live";

    // The client sends at most one file, tagged with its kind. Images and PDFs
    // go to the model as visual attachments; DOCX is extracted to text here;
    // TXT is extracted client-side and already folded into `copy`.
    let attachment: Attachment | undefined;
    const file = body.file;
    if (file != null) {
      if (typeof file.kind !== "string" || typeof file.data !== "string") {
        return bad("file must be { kind, data, mediaType? }");
      }
      if (file.kind === "image") {
        if (!ALLOWED_IMAGE_TYPES.includes(file.mediaType)) {
          return bad(`Unsupported image type. Use one of: ${ALLOWED_IMAGE_TYPES.join(", ")}`);
        }
        attachment = { kind: "image", data: file.data, mediaType: file.mediaType };
      } else if (file.kind === "pdf") {
        attachment = { kind: "pdf", data: file.data };
      } else if (file.kind === "docx") {
        // Word isn't a native Claude attachment type — pull the text out here
        // and treat it as pasted copy (no visual/prominence assessment).
        const buffer = Buffer.from(file.data, "base64");
        const { value } = await mammoth.extractRawText({ buffer });
        const extracted = value.trim();
        if (!extracted) return bad("Could not read any text from that Word document.");
        copy = copy.trim() ? `${copy}\n\n${extracted}` : extracted;
      } else {
        return bad(`Unsupported file kind: ${file.kind}`);
      }
    }

    if (!copy.trim() && !attachment) {
      return bad("Provide marketing copy, a file, or both.");
    }

    // Free-trial limits. A visual check (image or PDF) costs several times a
    // text one, and long copy costs more again, so the demo is text-only and
    // capped at a normal promotion's length.
    if (free) {
      if (attachment) {
        return bad(
          "The free trial checks pasted copy. To check an image or PDF, book a 15-minute setup call."
        );
      }
      if (copy.length > FREE_MAX_CHARS) {
        return bad(
          `The free trial checks up to ${FREE_MAX_CHARS} characters at a time. Paste a shorter piece, or book a call to check a full page.`
        );
      }
    }

    const result = await runCheck(copy, attachment, access.key, medium, mode);

    // Central measurement backup — one structured line per check in the server
    // logs, independent of the client-side usage log a tester might not export.
    // Counts only, never the copy itself.
    console.log(
      JSON.stringify({
        evt: "check",
        at: new Date().toISOString(),
        tester: access.label ?? "unknown",
        free,
        medium: medium.id,
        mode,
        verdict: result.overall_verdict,
        flags: result.flags.length,
        missing: result.missing_required.length,
        attachment: attachment?.kind ?? null,
      })
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
