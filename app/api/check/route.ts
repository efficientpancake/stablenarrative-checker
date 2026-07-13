import { NextRequest, NextResponse } from "next/server";
import { runCheck, ImageInput } from "@/lib/engine";

export const runtime = "nodejs";

// Sonnet 5 vision accepts these image types.
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const copy = typeof body.copy === "string" ? body.copy : "";

    let image: ImageInput | undefined;
    if (body.image != null) {
      const { data, mediaType } = body.image;
      if (typeof data !== "string" || typeof mediaType !== "string") {
        return NextResponse.json(
          { error: "image must be { data: base64 string, mediaType: string }" },
          { status: 400 }
        );
      }
      if (!ALLOWED_IMAGE_TYPES.includes(mediaType)) {
        return NextResponse.json(
          { error: `Unsupported image type. Use one of: ${ALLOWED_IMAGE_TYPES.join(", ")}` },
          { status: 400 }
        );
      }
      image = { data, mediaType };
    }

    if (!copy.trim() && !image) {
      return NextResponse.json(
        { error: "Provide marketing copy, an image, or both." },
        { status: 400 }
      );
    }

    const result = await runCheck(copy, image);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
