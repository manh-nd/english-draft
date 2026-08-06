import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { isFolderId } from "@/lib/api/folder-id";
import {
  getDocument,
  updateDocument,
  deleteDocument,
  FolderNotFoundError,
} from "@/lib/db/documents";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const result = await requireSession();
  if (result instanceof NextResponse) return result;

  const { id } = await params;
  const doc = await getDocument(result.userId, id);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(doc);
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const result = await requireSession();
  if (result instanceof NextResponse) return result;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const patch: { title?: string; folderId?: string | null } = {};
  if (typeof body.title === "string") patch.title = body.title.trim();
  if ("folderId" in body) {
    const folderId = body.folderId ?? null;
    if (folderId !== null && !isFolderId(folderId)) {
      return NextResponse.json(
        { error: "Invalid Folder identifier" },
        { status: 400 }
      );
    }
    patch.folderId = folderId;
  }

  try {
    const doc = await updateDocument(result.userId, id, patch);
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(doc);
  } catch (error) {
    if (error instanceof FolderNotFoundError) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const result = await requireSession();
  if (result instanceof NextResponse) return result;

  const { id } = await params;
  const deleted = await deleteDocument(result.userId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
