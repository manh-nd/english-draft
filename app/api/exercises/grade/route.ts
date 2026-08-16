import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import {
  createGeminiService,
  GeminiQuotaExhaustedError,
  GEMINI_MODELS,
} from "@/lib/ai/gemini";
import { buildGradingPrompt, type ExerciseSource } from "@/lib/ai/chat";
import { calculateNextInterval } from "@/lib/srs/sm2";
import { listDueReviewItems, updateReviewItem } from "@/lib/db/review";
import type { ReviewItemWithSource } from "@/lib/db/review";

let geminiService: ReturnType<typeof createGeminiService> | undefined;
function getGeminiService() {
  geminiService ??= createGeminiService();
  return geminiService;
}

interface GradingResult {
  rating: number;
  feedback: string;
}

function parseGradingResult(text: string): GradingResult | null {
  try {
    // Try to find JSON in the response
    const match = text.match(/\{[^}]+\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as {
      rating?: unknown;
      feedback?: unknown;
    };
    if (
      typeof parsed.rating !== "number" ||
      parsed.rating < 0 ||
      parsed.rating > 5 ||
      typeof parsed.feedback !== "string"
    ) {
      return null;
    }
    return { rating: parsed.rating, feedback: parsed.feedback };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const result = await requireSession();
  if (result instanceof NextResponse) return result;

  const body = await req.json().catch(() => null);
  const { reviewItemId, exercisePrompt, userAnswer } =
    (body as Record<string, unknown>) ?? {};

  if (
    typeof reviewItemId !== "string" ||
    typeof exercisePrompt !== "string" ||
    typeof userAnswer !== "string" ||
    userAnswer.trim().length === 0
  ) {
    return NextResponse.json(
      {
        error:
          "reviewItemId, exercisePrompt, and a non-empty userAnswer are required",
      },
      { status: 400 }
    );
  }

  // Find review item
  const dueItems = await listDueReviewItems(result.userId);
  const reviewItem = dueItems.find((item) => item.id === reviewItemId) as
    ReviewItemWithSource | undefined;

  if (!reviewItem) {
    return NextResponse.json(
      { error: "Review Item not found or not yet due" },
      { status: 404 }
    );
  }

  const source: ExerciseSource =
    reviewItem.source === "correction"
      ? {
          type: "correction",
          originalText: reviewItem.correction?.originalText,
          correctedText: reviewItem.correction?.correctedText,
          errorType: reviewItem.correction?.errorType,
        }
      : {
          type: "vocabulary",
          phrase: reviewItem.vocabularyItem?.phrase,
          definition: reviewItem.vocabularyItem?.definition,
          exampleSentence: reviewItem.vocabularyItem?.exampleSentence,
        };

  const gradingPrompt = buildGradingPrompt(
    exercisePrompt,
    userAnswer.trim(),
    source
  );

  try {
    const gradingText = await getGeminiService().generate(gradingPrompt, {
      model: GEMINI_MODELS.FLASH,
    });

    const grading = parseGradingResult(gradingText);
    if (!grading) {
      throw new Error("Could not parse grading response");
    }

    // Update SRS scheduling
    const { interval, easeFactor, nextReviewAt } = calculateNextInterval(
      reviewItem.interval,
      reviewItem.easeFactor,
      grading.rating
    );

    await updateReviewItem(result.userId, reviewItemId, {
      interval,
      easeFactor,
      nextReviewAt,
      lastReviewedAt: new Date(),
    });

    return NextResponse.json({
      rating: grading.rating,
      feedback: grading.feedback,
      nextReviewAt,
    });
  } catch (error) {
    if (error instanceof GeminiQuotaExhaustedError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Exercise grading failed", error);
    return NextResponse.json(
      { error: "Grading failed. Try again." },
      { status: 503 }
    );
  }
}
