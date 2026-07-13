import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { runCheck, Attachment } from "@/lib/engine";

export const runtime = "nodejs";

// Sonnet 5 vision accepts these image types.
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let copy = typeof body.copy === "string" ? body.copy : "";

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

    const result = await runCheck(copy, attachment);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
