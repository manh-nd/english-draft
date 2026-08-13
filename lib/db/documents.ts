import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { documents, folders } from "@/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Document = typeof documents.$inferSelect;
export type DocumentListItem = Pick<
  Document,
  "id" | "title" | "folderId" | "createdAt" | "updatedAt"
>;

export class FolderNotFoundError extends Error {
  constructor() {
    super("Folder not found");
    this.name = "FolderNotFoundError";
  }
}

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function assertOwnedFolder(
  tx: DatabaseTransaction,
  userId: string,
  folderId: string
): Promise<void> {
  const [folder] = await tx
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
    .for("update");

  if (!folder) throw new FolderNotFoundError();
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/** List all Documents for a user (no content). Ordered by updatedAt desc. */
export async function listDocuments(
  userId: string
): Promise<DocumentListItem[]> {
  return db
    .select({
      id: documents.id,
      title: documents.title,
      folderId: documents.folderId,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.updatedAt));
}

/** Full-text search across Documents using the pre-built GIN index on text_content. */
export async function searchDocuments(
  userId: string,
  query: string
): Promise<DocumentListItem[]> {
  return db
    .select({
      id: documents.id,
      title: documents.title,
      folderId: documents.folderId,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(
      and(
        eq(documents.userId, userId),
        // Keep this expression identical to documents_text_content_gin_idx.
        sql`to_tsvector('english', ${documents.textContent}) @@ plainto_tsquery('english', ${query})`
      )
    )
    .orderBy(desc(documents.updatedAt));
}

/** Fetch a single Document by ID. Scoped to owner. */
export async function getDocument(
  userId: string,
  documentId: string
): Promise<Document | null> {
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)));
  return doc ?? null;
}

/** Create a new Document, optionally inside a Folder. */
export async function createDocument(
  userId: string,
  folderId?: string | null
): Promise<Document> {
  return db.transaction(async (tx) => {
    if (folderId) await assertOwnedFolder(tx, userId, folderId);

    const [doc] = await tx
      .insert(documents)
      .values({ userId, folderId: folderId ?? null, title: "Untitled" })
      .returning();
    return doc;
  });
}

/**
 * Update a Document's title and/or folderId.
 * Pass `folderId: null` to move to root.
 */
export async function updateDocument(
  userId: string,
  documentId: string,
  patch: {
    title?: string;
    folderId?: string | null;
    content?: Record<string, unknown> | null;
    textContent?: string | null;
  }
): Promise<Document | null> {
  const folderId = patch.folderId;
  return db.transaction(async (tx) => {
    if (folderId) await assertOwnedFolder(tx, userId, folderId);

    const [doc] = await tx
      .update(documents)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
      .returning();
    return doc ?? null;
  });
}

/** Delete a Document. Returns true if deleted. */
export async function deleteDocument(
  userId: string,
  documentId: string
): Promise<boolean> {
  const result = await db
    .delete(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
    .returning({ id: documents.id });
  return result.length > 0;
}
