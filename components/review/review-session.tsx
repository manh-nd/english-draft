"use client";

import { useState, useCallback } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { ReviewItemWithSource } from "@/lib/db/review";
import { ReviewHeader } from "./review-header";
import { ReviewStartCard } from "./review-start-card";
import { ReviewExerciseCard } from "./review-exercise-card";
import { ReviewFeedbackCard } from "./review-feedback-card";
import {
  ReviewCelebrationCard,
  type SessionSummaryStats,
} from "./review-celebration-card";

interface ReviewSessionProps {
  dueItems: ReviewItemWithSource[];
}

type SessionState =
  | { phase: "idle" }
  | { phase: "generating"; itemIndex: number }
  | {
      phase: "answering";
      itemIndex: number;
      exerciseType: string;
      exercisePrompt: string;
    }
  | {
      phase: "grading";
      itemIndex: number;
      exerciseType: string;
      exercisePrompt: string;
    }
  | {
      phase: "feedback";
      itemIndex: number;
      rating: number;
      feedback: string;
      userAnswer: string;
      nextReviewAt?: string;
    }
  | { phase: "done" };

interface ReviewRecord {
  rating: number;
  isCorrect: boolean;
}

export function ReviewSession({ dueItems }: ReviewSessionProps) {
  const [items] = useState<ReviewItemWithSource[]>(dueItems);
  const [state, setState] = useState<SessionState>({ phase: "idle" });
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sessionRecords, setSessionRecords] = useState<ReviewRecord[]>([]);

  const currentItem =
    state.phase !== "idle" && state.phase !== "done"
      ? items[state.itemIndex]
      : null;

  const generateExercise = useCallback(
    async (itemIndex: number) => {
      const item = items[itemIndex];
      if (!item) {
        setState({ phase: "done" });
        return;
      }

      setState({ phase: "generating", itemIndex });
      setError(null);

      try {
        const res = await fetch("/api/exercises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewItemId: item.id }),
        });

        const data = (await res.json().catch(() => null)) as {
          exercise?: { type: string; prompt: string };
          error?: string;
        } | null;

        if (!res.ok || !data?.exercise) {
          throw new Error(data?.error ?? "Exercise generation failed.");
        }

        setAnswer("");
        setState({
          phase: "answering",
          itemIndex,
          exerciseType: data.exercise.type,
          exercisePrompt: data.exercise.prompt,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Exercise generation failed."
        );
        setState({ phase: "idle" });
      }
    },
    [items]
  );

  const startSession = useCallback(async () => {
    if (items.length === 0) return;
    setSessionRecords([]);
    await generateExercise(0);
  }, [items, generateExercise]);

  const submitAnswer = useCallback(async () => {
    if (state.phase !== "answering" || answer.trim().length === 0) return;

    const { itemIndex, exerciseType, exercisePrompt } = state;
    const item = items[itemIndex];
    const submittedAnswer = answer.trim();

    setState({
      phase: "grading",
      itemIndex,
      exerciseType,
      exercisePrompt,
    });
    setError(null);

    try {
      const res = await fetch("/api/exercises/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewItemId: item.id,
          exercisePrompt,
          userAnswer: submittedAnswer,
        }),
      });

      const data = (await res.json().catch(() => null)) as {
        rating?: number;
        feedback?: string;
        nextReviewAt?: string;
        error?: string;
      } | null;

      if (!res.ok || data?.rating === undefined || !data?.feedback) {
        throw new Error(data?.error ?? "Grading failed.");
      }

      // Record result for session statistics
      const isCorrect = data.rating >= 3;
      setSessionRecords((prev) => [
        ...prev,
        { rating: data.rating!, isCorrect },
      ]);

      setState({
        phase: "feedback",
        itemIndex,
        rating: data.rating,
        feedback: data.feedback,
        userAnswer: submittedAnswer,
        nextReviewAt: data.nextReviewAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Grading failed.");
      setState({
        phase: "answering",
        itemIndex,
        exerciseType,
        exercisePrompt,
      });
    }
  }, [state, answer, items]);

  const nextItem = useCallback(async () => {
    if (state.phase !== "feedback") return;
    const nextIndex = state.itemIndex + 1;
    if (nextIndex >= items.length) {
      setState({ phase: "done" });
    } else {
      await generateExercise(nextIndex);
    }
  }, [state, items, generateExercise]);

  // Compute summary stats for the celebration card
  const summaryStats: SessionSummaryStats = {
    totalReviewed: sessionRecords.length,
    averageRating:
      sessionRecords.length > 0
        ? sessionRecords.reduce((sum, r) => sum + r.rating, 0) /
          sessionRecords.length
        : 0,
    perfectCount: sessionRecords.filter((r) => r.rating === 5).length,
    accuracyPercent:
      sessionRecords.length > 0
        ? Math.round(
            (sessionRecords.filter((r) => r.isCorrect).length /
              sessionRecords.length) *
              100
          )
        : 100,
  };

  // ── Render Views ──────────────────────────────────────────────────────────

  if (state.phase === "idle") {
    return <ReviewStartCard dueItems={items} onStart={startSession} />;
  }

  if (state.phase === "done") {
    return (
      <ReviewCelebrationCard
        stats={summaryStats}
        onRestart={() => {
          setState({ phase: "idle" });
        }}
      />
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 animate-in fade-in-50 duration-300">
      {/* Zen Mode Header */}
      <ReviewHeader
        currentIndex={state.itemIndex}
        totalItems={items.length}
        onExit={() => setState({ phase: "idle" })}
      />

      {/* Generating State */}
      {state.phase === "generating" && (
        <div className="rounded-2xl border border-border/80 bg-card/90 p-12 text-center shadow-md backdrop-blur-sm space-y-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Preparing Exercise {state.itemIndex + 1} of {items.length}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" />
              Tailoring active recall prompt using AI...
            </p>
          </div>
        </div>
      )}

      {/* Answering or Grading State */}
      {(state.phase === "answering" || state.phase === "grading") &&
        currentItem && (
          <ReviewExerciseCard
            item={currentItem}
            exerciseType={state.exerciseType}
            exercisePrompt={state.exercisePrompt}
            answer={answer}
            onAnswerChange={setAnswer}
            onSubmit={submitAnswer}
            isGrading={state.phase === "grading"}
            error={error}
          />
        )}

      {/* Feedback State */}
      {state.phase === "feedback" && (
        <ReviewFeedbackCard
          rating={state.rating}
          feedback={state.feedback}
          userAnswer={state.userAnswer}
          nextReviewAt={state.nextReviewAt}
          isLastItem={state.itemIndex + 1 >= items.length}
          onNext={nextItem}
        />
      )}
    </div>
  );
}
