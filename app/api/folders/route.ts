import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { listFolders, createFolder } from "@/lib/db/folders";

export async function GET() {
  const result = await requireSession();
  if (result instanceof NextResponse) return result;

  const folders = await listFolders(result.userId);
  return NextResponse.json(folders);
}

export async function POST(req: NextRequest) {
  const result = await requireSession();
  if (result instanceof NextResponse) return result;

  const body = await req.json().catch(() => null);
  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const folder = await createFolder(result.userId, name);
  return NextResponse.json(folder, { status: 201 });
}
