import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { toggleCorrectionStar, deleteCorrection } from "@/lib/db/corrections";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(_req: NextRequest, { params }: RouteParams) {
  const result = await requireSession();
  if (result instanceof NextResponse) return result;

  const { id } = await params;
  const correction = await toggleCorrectionStar(result.userId, id);
  if (!correction) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(correction);
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const result = await requireSession();
  if (result instanceof NextResponse) return result;

  const { id } = await params;
  const deleted = await deleteCorrection(result.userId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
