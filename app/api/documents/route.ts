import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import { isFolderId } from "@/lib/api/folder-id";
import {
  listDocuments,
  searchDocuments,
  createDocument,
  FolderNotFoundError,
} from "@/lib/db/documents";

export async function GET(req: NextRequest) {
  const result = await requireSession();
  if (result instanceof NextResponse) return result;

  const q = req.nextUrl.searchParams.get("q")?.trim();

  const docs = q
    ? await searchDocuments(result.userId, q)
    : await listDocuments(result.userId);

  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  const result = await requireSession();
  if (result instanceof NextResponse) return result;

  const body = await req.json().catch(() => ({}));
  const folderId = body?.folderId ?? null;
  if (folderId !== null && !isFolderId(folderId)) {
    return NextResponse.json(
      { error: "Invalid Folder identifier" },
      { status: 400 }
    );
  }

  const title =
    typeof body?.title === "string" && body.title.trim()
      ? body.title.trim()
      : undefined;
  const content =
    body?.content && typeof body.content === "object"
      ? (body.content as Record<string, unknown>)
      : undefined;
  const textContent =
    typeof body?.textContent === "string" ? body.textContent : undefined;

  try {
    const doc = await createDocument(result.userId, folderId, {
      title,
      content,
      textContent,
    });
    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    if (error instanceof FolderNotFoundError) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
    throw error;
  }
}
