import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { listCorrections, createCorrection } from "@/lib/db/corrections";

const VALID_ERROR_TYPES = ["grammar", "vocabulary", "style"] as const;
type ErrorType = (typeof VALID_ERROR_TYPES)[number];

function isErrorType(value: unknown): value is ErrorType {
  return (
    typeof value === "string" && VALID_ERROR_TYPES.some((t) => t === value)
  );
}

export async function GET() {
  const result = await requireSession();
  if (result instanceof NextResponse) return result;

  const list = await listCorrections(result.userId);
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const result = await requireSession();
  if (result instanceof NextResponse) return result;

  const body = await req.json().catch(() => null);
  const { originalText, correctedText, errorType, documentId, context } =
    (body as Record<string, unknown>) ?? {};

  if (
    typeof originalText !== "string" ||
    originalText.trim().length === 0 ||
    typeof correctedText !== "string" ||
    correctedText.trim().length === 0 ||
    !isErrorType(errorType)
  ) {
    return NextResponse.json(
      {
        error:
          "originalText, correctedText (non-empty strings) and a valid errorType (grammar | vocabulary | style) are required",
      },
      { status: 400 }
    );
  }

  const correction = await createCorrection(result.userId, {
    originalText: originalText.trim(),
    correctedText: correctedText.trim(),
    errorType,
    documentId: typeof documentId === "string" ? documentId : null,
    context: typeof context === "string" ? context : null,
  });

  return NextResponse.json(correction, { status: 201 });
}
