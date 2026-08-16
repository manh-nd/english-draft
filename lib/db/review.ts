import { eq, and, lte, desc } from "drizzle-orm";
import { db } from "@/db";
import { reviewItems, corrections, vocabularyItems } from "@/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReviewItem = typeof reviewItems.$inferSelect;

export type ReviewItemWithSource = ReviewItem & {
  correction: typeof corrections.$inferSelect | null;
  vocabularyItem: typeof vocabularyItems.$inferSelect | null;
};

// ─── Queries ─────────────────────────────────────────────────────────────────

/** Create a Review Item linked to a Correction. */
export async function createReviewItemForCorrection(
  userId: string,
  correctionId: string
): Promise<ReviewItem> {
  const [item] = await db
    .insert(reviewItems)
    .values({ userId, source: "correction", correctionId })
    .returning();
  return item;
}

/** Create a Review Item linked to a Vocabulary Item. */
export async function createReviewItemForVocabulary(
  userId: string,
  vocabularyItemId: string
): Promise<ReviewItem> {
  const [item] = await db
    .insert(reviewItems)
    .values({ userId, source: "vocabulary_item", vocabularyItemId })
    .returning();
  return item;
}

/**
 * List all Review Items due for review (nextReviewAt <= now),
 * joined with their source (correction or vocabulary item).
 */
export async function listDueReviewItems(
  userId: string
): Promise<ReviewItemWithSource[]> {
  const rows = await db
    .select({
      reviewItem: reviewItems,
      correction: corrections,
      vocabularyItem: vocabularyItems,
    })
    .from(reviewItems)
    .leftJoin(corrections, eq(reviewItems.correctionId, corrections.id))
    .leftJoin(
      vocabularyItems,
      eq(reviewItems.vocabularyItemId, vocabularyItems.id)
    )
    .where(
      and(
        eq(reviewItems.userId, userId),
        lte(reviewItems.nextReviewAt, new Date())
      )
    )
    .orderBy(desc(reviewItems.nextReviewAt));

  return rows.map((r) => ({
    ...r.reviewItem,
    correction: r.correction ?? null,
    vocabularyItem: r.vocabularyItem ?? null,
  }));
}

/** Count due Review Items for a user. */
export async function countDueReviewItems(userId: string): Promise<number> {
  const rows = await listDueReviewItems(userId);
  return rows.length;
}

/** Update a Review Item's SRS metadata after a review session. */
export async function updateReviewItem(
  userId: string,
  reviewItemId: string,
  patch: {
    interval: number;
    easeFactor: number;
    nextReviewAt: Date;
    lastReviewedAt: Date;
  }
): Promise<ReviewItem | null> {
  const [updated] = await db
    .update(reviewItems)
    .set(patch)
    .where(
      and(eq(reviewItems.id, reviewItemId), eq(reviewItems.userId, userId))
    )
    .returning();
  return updated ?? null;
}
