import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { corrections, documents } from "@/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Correction = typeof corrections.$inferSelect;

export type CorrectionWithDocument = Correction & {
  documentTitle: string | null;
};

export type CreateCorrectionInput = {
  documentId?: string | null;
  originalText: string;
  correctedText: string;
  errorType: "grammar" | "vocabulary" | "style";
  context?: string | null;
};

// ─── Queries ─────────────────────────────────────────────────────────────────

/** List all Corrections for a user, newest first. */
export async function listCorrections(userId: string): Promise<Correction[]> {
  return db
    .select()
    .from(corrections)
    .where(eq(corrections.userId, userId))
    .orderBy(desc(corrections.createdAt));
}

/**
 * List all Corrections for a user with their source document title,
 * newest first.
 */
export async function listCorrectionsWithDocument(
  userId: string
): Promise<CorrectionWithDocument[]> {
  const rows = await db
    .select({
      correction: corrections,
      documentTitle: documents.title,
    })
    .from(corrections)
    .leftJoin(documents, eq(corrections.documentId, documents.id))
    .where(eq(corrections.userId, userId))
    .orderBy(desc(corrections.createdAt));

  return rows.map((r) => ({
    ...r.correction,
    documentTitle: r.documentTitle ?? null,
  }));
}

/** Create a new Correction (auto-saved from an accepted Inline Suggestion). */
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
