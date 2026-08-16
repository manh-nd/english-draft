"use client";

import { useState, useCallback } from "react";
import {
  BrainCircuit,
  CheckCircle,
  ChevronRight,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import type { ReviewItemWithSource } from "@/lib/db/review";

interface ReviewSessionClientProps {
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
  | { phase: "grading"; itemIndex: number }
  | {
      phase: "feedback";
      itemIndex: number;
      rating: number;
      feedback: string;
      nextReviewAt: string;
    }
  | { phase: "done" };

const RATING_LABELS: Record<number, { label: string; color: string }> = {
  5: { label: "Perfect!", color: "text-green-600 dark:text-green-400" },
  4: { label: "Good", color: "text-green-600 dark:text-green-400" },
  3: { label: "OK", color: "text-amber-600 dark:text-amber-400" },
  2: { label: "Needs work", color: "text-orange-600 dark:text-orange-400" },
  1: { label: "Incorrect", color: "text-red-600 dark:text-red-400" },
  0: { label: "No attempt", color: "text-red-600 dark:text-red-400" },
};

export function ReviewSessionClient({ dueItems }: ReviewSessionClientProps) {
  const [items] = useState<ReviewItemWithSource[]>(dueItems);
  const [state, setState] = useState<SessionState>({ phase: "idle" });
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);

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
    setState({ phase: "generating", itemIndex: 0 });
    setError(null);
    await generateExercise(0);
  }, [items, generateExercise]);

  const submitAnswer = useCallback(async () => {
    if (state.phase !== "answering" || answer.trim().length === 0) return;

    const { itemIndex, exercisePrompt } = state;
    const item = items[itemIndex];
    setState({ phase: "grading", itemIndex });
    setError(null);

    try {
      const res = await fetch("/api/exercises/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewItemId: item.id,
          exercisePrompt,
          userAnswer: answer.trim(),
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

      setCompletedCount((c) => c + 1);
      setState({
        phase: "feedback",
        itemIndex,
        rating: data.rating,
        feedback: data.feedback,
        nextReviewAt: data.nextReviewAt ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Grading failed.");
      setState({
        phase: "answering",
        itemIndex,
        exerciseType: "",
        exercisePrompt: "",
      } as unknown as SessionState);
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

  // ── Idle ──────────────────────────────────────────────────────────────────

  if (state.phase === "idle") {
    if (items.length === 0) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BrainCircuit />
            </EmptyMedia>
            <EmptyTitle>Nothing due today</EmptyTitle>
            <EmptyDescription>
              Accept AI corrections or save vocabulary items to build your
              review queue.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
    }

    return (
      <div className="flex max-w-lg flex-col gap-4">
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          You&apos;ll practice {items.length} item
          {items.length === 1 ? "" : "s"} today. Type your answers — no multiple
          choice. The AI will grade each one and schedule the next review
          automatically.
        </div>
        <Button size="lg" onClick={() => void startSession()}>
          Start Review Session
          <ChevronRight className="ml-1 size-4" />
        </Button>
      </div>
    );
  }

  // ── Done ─────────────────────────────────────────────────────────────────

  if (state.phase === "done") {
    return (
      <div className="flex max-w-lg flex-col gap-4">
        <div className="flex items-center gap-3 rounded-lg border bg-card p-6">
          <CheckCircle className="size-10 shrink-0 text-green-500" />
          <div>
            <p className="font-semibold">Session complete!</p>
            <p className="text-sm text-muted-foreground">
              You reviewed {completedCount} item
              {completedCount === 1 ? "" : "s"}. Come back tomorrow for the next
              batch.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RotateCcw className="mr-2 size-4" />
          Reload session
        </Button>
      </div>
    );
  }

  // ── Item source info ──────────────────────────────────────────────────────

  const sourceLabel =
    currentItem?.source === "correction"
      ? `${currentItem.correction?.errorType ?? "correction"} correction`
      : "vocabulary";

  const progress = `${state.itemIndex + 1} / ${items.length}`;

  // ── Generating ────────────────────────────────────────────────────────────

  if (state.phase === "generating") {
    return (
      <div className="flex max-w-lg flex-col gap-4">
        <ProgressBar current={state.itemIndex + 1} total={items.length} />
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Generating exercise {progress}…
        </div>
      </div>
    );
  }

  // ── Answering ─────────────────────────────────────────────────────────────

  if (state.phase === "answering") {
    const isFillInBlank = state.exerciseType === "fill-in-blank";
    return (
      <div className="flex max-w-lg flex-col gap-4">
        <ProgressBar current={state.itemIndex + 1} total={items.length} />
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
              {state.exerciseType.replace("-", " ")} · {sourceLabel}
            </span>
            <span className="text-xs text-muted-foreground">{progress}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm">{state.exercisePrompt}</p>
        </div>
        <div className="flex flex-col gap-2">
          {isFillInBlank ? (
            <Input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here…"
              className="text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submitAnswer();
                }
              }}
            />
          ) : (
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here…"
              className="min-h-24 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  e.preventDefault();
                  void submitAnswer();
                }
              }}
            />
          )}
          <p className="text-xs text-muted-foreground">
            {isFillInBlank ? "Enter to submit" : "Ctrl+Enter to submit"}
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          onClick={() => void submitAnswer()}
          disabled={answer.trim().length === 0}
        >
          Submit answer
        </Button>
      </div>
    );
  }

  // ── Grading ───────────────────────────────────────────────────────────────

  if (state.phase === "grading") {
    return (
      <div className="flex max-w-lg flex-col gap-4">
        <ProgressBar current={state.itemIndex + 1} total={items.length} />
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Grading your answer…
        </div>
      </div>
    );
  }

  // ── Feedback ──────────────────────────────────────────────────────────────

  if (state.phase === "feedback") {
    const ratingInfo = RATING_LABELS[state.rating] ?? RATING_LABELS[0];
    const isLastItem = state.itemIndex + 1 >= items.length;

    return (
      <div className="flex max-w-lg flex-col gap-4">
        <ProgressBar current={state.itemIndex + 1} total={items.length} />
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${ratingInfo.color}`}>
              {ratingInfo.label}
            </span>
            <span className="text-sm text-muted-foreground">
              ({state.rating}/5)
            </span>
          </div>
          <p className="mt-2 text-sm">{state.feedback}</p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={() => void nextItem()}>
          {isLastItem ? (
            <>
              <CheckCircle className="mr-2 size-4" />
              Finish session
            </>
          ) : (
            <>
              Next item
              <ChevronRight className="ml-1 size-4" />
            </>
          )}
        </Button>
      </div>
    );
  }

  return null;
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
        <span>Progress</span>
        <span>
          {current}/{total}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
