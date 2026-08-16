import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { corrections, documents, reviewItems } from "@/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Correction = typeof corrections.$inferSelect;

export type CorrectionWithDocument = Correction & {
  documentTitle: string | null;
  reviewItem?: {
    id: string;
    interval: number;
    easeFactor: number;
    nextReviewAt: Date;
    lastReviewedAt: Date | null;
  } | null;
};

export type CreateCorrectionInput = {
  documentId?: string | null;
  originalText: string;
  correctedText: string;
  errorType: "grammar" | "vocabulary" | "style";
  context?: string | null;
};

// ─── Queries ─────────────────────────────────────────────────────────────────

/** Count total Corrections saved for a user. */
export async function countCorrections(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(corrections)
    .where(eq(corrections.userId, userId));
  return result[0]?.count ?? 0;
}

/** List all Corrections for a user, newest first. */
export async function listCorrections(userId: string): Promise<Correction[]> {
  return db
    .select()
    .from(corrections)
    .where(eq(corrections.userId, userId))
    .orderBy(desc(corrections.createdAt));
}

/**
 * List all Corrections for a user with their source document title
 * and SRS Review metadata, newest first.
 */
export async function listCorrectionsWithDocument(
  userId: string
): Promise<CorrectionWithDocument[]> {
  const rows = await db
    .select({
      correction: corrections,
      documentTitle: documents.title,
      reviewItem: reviewItems,
    })
    .from(corrections)
    .leftJoin(documents, eq(corrections.documentId, documents.id))
    .leftJoin(
      reviewItems,
      and(
        eq(reviewItems.correctionId, corrections.id),
        eq(reviewItems.userId, userId)
      )
    )
    .where(eq(corrections.userId, userId))
    .orderBy(desc(corrections.createdAt));

  return rows.map((r) => ({
    ...r.correction,
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

/** Create a new Correction (auto-saved from an accepted Inline Suggestion) and schedule for SRS review. */
export async function createCorrection(
  userId: string,
  input: CreateCorrectionInput
): Promise<Correction> {
  const [correction] = await db
    .insert(corrections)
    .values({
      userId,
      documentId: input.documentId ?? null,
      originalText: input.originalText,
      correctedText: input.correctedText,
      errorType: input.errorType,
      context: input.context ?? null,
    })
    .returning();

  // Auto-schedule in Spaced Repetition Review
  await db
    .insert(reviewItems)
    .values({
      userId,
      source: "correction",
      correctionId: correction.id,
    })
    .catch(() => {});

  return correction;
}

/** Toggle the starred flag on a Correction. Returns null if not found. */
export async function toggleCorrectionStar(
  userId: string,
  correctionId: string
): Promise<Correction | null> {
  // Fetch current state first
  const [existing] = await db
    .select({ starred: corrections.starred })
    .from(corrections)
    .where(
      and(eq(corrections.id, correctionId), eq(corrections.userId, userId))
    );

  if (!existing) return null;

  const [updated] = await db
    .update(corrections)
    .set({ starred: !existing.starred })
    .where(
      and(eq(corrections.id, correctionId), eq(corrections.userId, userId))
    )
    .returning();

  return updated ?? null;
}

/** Delete a Correction. Returns true if deleted. */
export async function deleteCorrection(
  userId: string,
  correctionId: string
): Promise<boolean> {
  const result = await db
    .delete(corrections)
    .where(
      and(eq(corrections.id, correctionId), eq(corrections.userId, userId))
    )
    .returning({ id: corrections.id });
  return result.length > 0;
}
