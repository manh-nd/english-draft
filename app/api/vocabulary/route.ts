import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { listVocabularyItems, createVocabularyItem } from "@/lib/db/vocabulary";

export async function GET() {
  const result = await requireSession();
  if (result instanceof NextResponse) return result;

  const items = await listVocabularyItems(result.userId);
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const result = await requireSession();
  if (result instanceof NextResponse) return result;

  const body = await req.json().catch(() => null);
  const { phrase, definition, exampleSentence, documentId } =
    (body as Record<string, unknown>) ?? {};

  if (typeof phrase !== "string" || phrase.trim().length === 0) {
    return NextResponse.json(
      { error: "phrase (non-empty string) is required" },
      { status: 400 }
    );
  }

  const item = await createVocabularyItem(result.userId, {
    phrase: phrase.trim(),
    definition: typeof definition === "string" ? definition.trim() : null,
    exampleSentence:
      typeof exampleSentence === "string" ? exampleSentence.trim() : null,
    documentId: typeof documentId === "string" ? documentId : null,
  });

  return NextResponse.json(item, { status: 201 });
}
