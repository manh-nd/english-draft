import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api/require-session";
import {
  createGeminiService,
  GeminiQuotaExhaustedError,
  GEMINI_MODELS,
} from "@/lib/ai/gemini";
import { buildExercisePrompt, type ExerciseSource } from "@/lib/ai/chat";
import { selectExerciseType } from "@/lib/srs/sm2";
import type { ReviewItemWithSource } from "@/lib/db/review";
import { listDueReviewItems } from "@/lib/db/review";

let geminiService: ReturnType<typeof createGeminiService> | undefined;
function getGeminiService() {
  geminiService ??= createGeminiService();
  return geminiService;
}

export async function POST(req: NextRequest) {
  const result = await requireSession();
  if (result instanceof NextResponse) return result;

  const body = await req.json().catch(() => null);
  const reviewItemId = body?.reviewItemId as string | undefined;

  if (!reviewItemId || typeof reviewItemId !== "string") {
    return NextResponse.json(
      { error: "reviewItemId is required" },
      { status: 400 }
    );
  }

  // Find the review item from the user's due list
  const dueItems = await listDueReviewItems(result.userId);
  const reviewItem = dueItems.find((item) => item.id === reviewItemId) as
    ReviewItemWithSource | undefined;

  if (!reviewItem) {
    return NextResponse.json(
      { error: "Review Item not found or not yet due" },
      { status: 404 }
    );
  }

  // Build the exercise source
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

  // Select exercise type based on error type + review count approximation
  const errorType =
    reviewItem.source === "correction"
      ? (reviewItem.correction?.errorType ?? "grammar")
      : "vocabulary";
  // Use interval as a proxy for review count (higher interval = more reviews)
  const reviewCount =
    reviewItem.interval <= 1 ? 0 : reviewItem.interval <= 6 ? 1 : 2;
  const exerciseType = selectExerciseType(errorType, reviewCount);

  const prompt = buildExercisePrompt(source, exerciseType);

  try {
    const exerciseText = await getGeminiService().generate(prompt, {
      model: GEMINI_MODELS.FLASH,
    });

    return NextResponse.json({
      exercise: {
        type: exerciseType,
        prompt: exerciseText.trim(),
      },
      reviewItemId,
    });
  } catch (error) {
    if (error instanceof GeminiQuotaExhaustedError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Exercise generation failed", error);
    return NextResponse.json(
      { error: "The exercise could not be generated. Try again." },
      { status: 503 }
    );
  }
}
