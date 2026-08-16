import { expect, test, describe } from "bun:test";
import { calculateNextInterval, selectExerciseType } from "./sm2";

// ─── calculateNextInterval ────────────────────────────────────────────────────

describe("calculateNextInterval", () => {
  test("rating < 3 resets interval to 1 and keeps ease factor", () => {
    const result = calculateNextInterval(10, 2.5, 2);
    expect(result.interval).toBe(1);
    expect(result.easeFactor).toBe(2.5);
  });

  test("rating < 3 (blackout) resets interval to 1", () => {
    const result = calculateNextInterval(20, 2.5, 0);
    expect(result.interval).toBe(1);
    expect(result.easeFactor).toBe(2.5);
  });

  test("first correct response (interval=0) stays at 1", () => {
    const result = calculateNextInterval(0, 2.5, 5);
    expect(result.interval).toBe(1);
  });

  test("second correct response (interval=1, rating=5) advances to 6", () => {
    const result = calculateNextInterval(1, 2.5, 5);
    expect(result.interval).toBe(6);
  });

  test("correct response increases ease factor for rating 5", () => {
    const result = calculateNextInterval(1, 2.5, 5);
    expect(result.easeFactor).toBeGreaterThan(2.5);
  });

  test("correct response decreases ease factor for rating 3", () => {
    const result = calculateNextInterval(1, 2.5, 3);
    expect(result.easeFactor).toBeLessThan(2.5);
  });

  test("ease factor never drops below 1.3", () => {
    // Simulate many bad ratings
    let ef = 2.5;
    let interval = 1;
    for (let i = 0; i < 20; i++) {
      const r = calculateNextInterval(interval, ef, 3);
      ef = r.easeFactor;
      interval = r.interval;
    }
    expect(ef).toBeGreaterThanOrEqual(1.3);
  });

  test("nextReviewAt is in the future", () => {
    const before = new Date();
    const result = calculateNextInterval(6, 2.5, 5);
    expect(result.nextReviewAt.getTime()).toBeGreaterThan(before.getTime());
  });

  test("throws for out-of-range rating", () => {
    expect(() => calculateNextInterval(1, 2.5, 6)).toThrow(RangeError);
    expect(() => calculateNextInterval(1, 2.5, -1)).toThrow(RangeError);
  });
});

// ─── selectExerciseType ───────────────────────────────────────────────────────

describe("selectExerciseType", () => {
  test("vocabulary, first review → fill-in-blank", () => {
    expect(selectExerciseType("vocabulary", 0)).toBe("fill-in-blank");
  });

  test("vocabulary, second review → translation", () => {
    expect(selectExerciseType("vocabulary", 1)).toBe("translation");
  });

  test("vocabulary, later reviews → free-writing", () => {
    expect(selectExerciseType("vocabulary", 5)).toBe("free-writing");
  });

  test("grammar, first review → rewrite", () => {
    expect(selectExerciseType("grammar", 0)).toBe("rewrite");
  });

  test("grammar, second review → fill-in-blank", () => {
    expect(selectExerciseType("grammar", 1)).toBe("fill-in-blank");
  });

  test("grammar, later reviews → free-writing", () => {
    expect(selectExerciseType("grammar", 3)).toBe("free-writing");
  });

  test("style, first review → rewrite", () => {
    expect(selectExerciseType("style", 0)).toBe("rewrite");
  });

  test("style, later reviews → free-writing", () => {
    expect(selectExerciseType("style", 2)).toBe("free-writing");
  });
});
