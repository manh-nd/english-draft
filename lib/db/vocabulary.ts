import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { vocabularyItems, documents, reviewItems } from "@/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VocabularyItem = typeof vocabularyItems.$inferSelect;

export type VocabularyItemWithDocument = VocabularyItem & {
  documentTitle: string | null;
  reviewItem?: {
    id: string;
    interval: number;
    easeFactor: number;
    nextReviewAt: Date;
    lastReviewedAt: Date | null;
  } | null;
};

export type CreateVocabularyItemInput = {
  documentId?: string | null;
  phrase: string;
  definition?: string | null;
  exampleSentence?: string | null;
};

// ─── Queries ─────────────────────────────────────────────────────────────────

/** Count total Vocabulary Items saved for a user. */
export async function countVocabularyItems(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(vocabularyItems)
    .where(eq(vocabularyItems.userId, userId));
  return result[0]?.count ?? 0;
}

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

/**
 * List all Vocabulary Items for a user with their source document title
 * and SRS Review metadata, newest first.
 */
export async function listVocabularyItemsWithDocument(
  userId: string
): Promise<VocabularyItemWithDocument[]> {
  const rows = await db
    .select({
      item: vocabularyItems,
      documentTitle: documents.title,
      reviewItem: reviewItems,
    })
    .from(vocabularyItems)
    .leftJoin(documents, eq(vocabularyItems.documentId, documents.id))
    .leftJoin(
      reviewItems,
      and(
        eq(reviewItems.vocabularyItemId, vocabularyItems.id),
        eq(reviewItems.userId, userId)
      )
    )
    .where(eq(vocabularyItems.userId, userId))
    .orderBy(desc(vocabularyItems.createdAt));

  return rows.map((r) => ({
    ...r.item,
    documentTitle: r.documentTitle ?? null,
    reviewItem: r.reviewItem
      ? {
          id: r.reviewItem.id,
          interval: r.reviewItem.interval,
          easeFactor: r.reviewItem.easeFactor,
          nextReviewAt: r.reviewItem.nextReviewAt,
          lastReviewedAt: r.reviewItem.lastReviewedAt,
        }
      : null,
  }));
}

/** Create a new Vocabulary Item and auto-schedule for SRS review. */
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

  // Auto-schedule in Spaced Repetition Review
  await db
    .insert(reviewItems)
    .values({
      userId,
      source: "vocabulary_item",
      vocabularyItemId: item.id,
    })
    .catch(() => {});

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
