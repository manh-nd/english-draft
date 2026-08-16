import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { deleteVocabularyItem } from "@/lib/db/vocabulary";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const result = await requireSession();
  if (result instanceof NextResponse) return result;

  const { id } = await params;
  const deleted = await deleteVocabularyItem(result.userId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
