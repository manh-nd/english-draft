import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { renameFolder, deleteFolder } from "@/lib/db/folders";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const result = await requireSession();
  if (result instanceof NextResponse) return result;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const folder = await renameFolder(result.userId, id, name);
  if (!folder) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(folder);
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const result = await requireSession();
  if (result instanceof NextResponse) return result;

  const { id } = await params;
  const deleted = await deleteFolder(result.userId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
