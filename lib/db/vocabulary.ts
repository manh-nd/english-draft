import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { vocabularyItems } from "@/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VocabularyItem = typeof vocabularyItems.$inferSelect;

export type CreateVocabularyItemInput = {
  documentId?: string | null;
  phrase: string;
  definition?: string | null;
  exampleSentence?: string | null;
};

// ─── Queries ─────────────────────────────────────────────────────────────────

/** List all Vocabulary Items for a user, newest first. */
export async function listVocabularyItems(
  userId: string
): Promise<VocabularyItem[]> {
  return db
    .select()
    .from(vocabularyItems)
    .where(eq(vocabularyItems.userId, userId))
    .orderBy(desc(vocabularyItems.createdAt));
}

/** Create a new Vocabulary Item. */
export async function createVocabularyItem(
  userId: string,
  input: CreateVocabularyItemInput
): Promise<VocabularyItem> {
  const [item] = await db
    .insert(vocabularyItems)
    .values({
      userId,
      documentId: input.documentId ?? null,
      phrase: input.phrase,
      definition: input.definition ?? null,
      exampleSentence: input.exampleSentence ?? null,
    })
    .returning();
  return item;
}

/** Delete a Vocabulary Item. Returns true if deleted. */
export async function deleteVocabularyItem(
  userId: string,
  itemId: string
): Promise<boolean> {
  const result = await db
    .delete(vocabularyItems)
    .where(
      and(eq(vocabularyItems.id, itemId), eq(vocabularyItems.userId, userId))
    )
    .returning({ id: vocabularyItems.id });
  return result.length > 0;
}
