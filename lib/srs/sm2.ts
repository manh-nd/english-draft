/**
 * SM-2 Spaced Repetition System
 *
 * Pure functions — no side effects, no external dependencies.
 * Rating scale: 0–5 (SM-2 standard)
 *   5 = perfect response
 *   4 = correct with hesitation
 *   3 = correct with difficulty
 *   2 = incorrect but remembered on hint
 *   1 = incorrect, remembered
 *   0 = complete blackout
 */

export type ExerciseType =
  "fill-in-blank" | "rewrite" | "translation" | "free-writing";

export type ErrorType = "grammar" | "vocabulary" | "style";

export interface Sm2Result {
  interval: number; // days until next review
  easeFactor: number; // SM-2 ease factor
  nextReviewAt: Date;
}

const MIN_EASE_FACTOR = 1.3;

/**
 * Calculate the next SM-2 interval and ease factor after a review.
 * @param interval  Current interval in days
 * @param easeFactor  Current ease factor (default 2.5)
 * @param rating  User response quality 0–5
 */
export function calculateNextInterval(
  interval: number,
  easeFactor: number,
  rating: number
): Sm2Result {
  if (rating < 0 || rating > 5) {
    throw new RangeError(`Rating must be 0–5, got ${rating}`);
  }

  let nextInterval: number;
  let nextEaseFactor: number;

  if (rating < 3) {
    // Incorrect response — reset to beginning
    nextInterval = 1;
    nextEaseFactor = easeFactor;
  } else {
    // Correct response — apply SM-2 interval progression
    if (interval <= 1) {
      nextInterval = 1;
    } else if (interval === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(interval * easeFactor);
    }

    // Adjust ease factor
    nextEaseFactor = Math.max(
      MIN_EASE_FACTOR,
      easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
    );
  }

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + nextInterval);

  return {
    interval: nextInterval,
    easeFactor: nextEaseFactor,
    nextReviewAt,
  };
}

/**
 * Select an exercise type based on error type and review count.
 * Later reviews use harder exercise types.
 */
export function selectExerciseType(
  errorType: ErrorType,
  reviewCount: number
): ExerciseType {
  if (errorType === "vocabulary") {
    // Vocabulary: start with fill-in-blank, progress to free writing
    if (reviewCount === 0) return "fill-in-blank";
    if (reviewCount === 1) return "translation";
    return "free-writing";
  }

  if (errorType === "grammar") {
    // Grammar: start with rewrite, progress to free writing
    if (reviewCount === 0) return "rewrite";
    if (reviewCount === 1) return "fill-in-blank";
    return "free-writing";
  }

  // style
  if (reviewCount === 0) return "rewrite";
  return "free-writing";
}
