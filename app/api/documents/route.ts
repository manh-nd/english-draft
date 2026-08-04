import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import {
  listDocuments,
  searchDocuments,
  createDocument,
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

  const doc = await createDocument(result.userId, folderId);
  return NextResponse.json(doc, { status: 201 });
}
