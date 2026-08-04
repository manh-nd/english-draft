import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import { folders } from "@/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Folder = typeof folders.$inferSelect;
export type NewFolder = Pick<Folder, "userId" | "name">;

// ─── Queries ─────────────────────────────────────────────────────────────────

/** List all Folders belonging to a user, ordered alphabetically. */
export async function listFolders(userId: string): Promise<Folder[]> {
  return db
    .select()
    .from(folders)
    .where(eq(folders.userId, userId))
    .orderBy(asc(folders.name));
}

/** Create a new Folder for a user. */
export async function createFolder(
  userId: string,
  name: string
): Promise<Folder> {
  const [folder] = await db
    .insert(folders)
    .values({ userId, name })
    .returning();
  return folder;
}

/** Rename a Folder. Scoped to the owner — returns null if not found. */
export async function renameFolder(
  userId: string,
  folderId: string,
  name: string
): Promise<Folder | null> {
  const [folder] = await db
    .update(folders)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
    .returning();
  return folder ?? null;
}

/** Delete a Folder. The FK `ON DELETE SET NULL` moves child Documents to root. */
export async function deleteFolder(
  userId: string,
  folderId: string
): Promise<boolean> {
  const result = await db
    .delete(folders)
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
    .returning({ id: folders.id });
  return result.length > 0;
}
