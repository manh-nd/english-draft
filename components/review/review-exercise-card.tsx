"use client";

import { useRef, useEffect } from "react";
import {
  PenTool,
  Sparkles,
  Languages,
  FileEdit,
  CornerDownLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ReviewItemWithSource } from "@/lib/db/review";

interface ReviewExerciseCardProps {
  item: ReviewItemWithSource;
  exerciseType: string;
  exercisePrompt: string;
  answer: string;
  onAnswerChange: (value: string) => void;
  onSubmit: () => void;
  isGrading: boolean;
  error?: string | null;
}

const EXERCISE_CONFIG: Record<
  string,
  { label: string; icon: typeof PenTool; color: string }
> = {
  "fill-in-blank": {
    label: "Fill in the blank",
    icon: FileEdit,
    color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  },
  rewrite: {
    label: "Rewrite & Correct",
    icon: PenTool,
    color:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  translation: {
    label: "Translation",
    icon: Languages,
    color:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  "free-writing": {
    label: "Free Writing",
    icon: Sparkles,
    color:
      "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
};

export function ReviewExerciseCard({
  item,
  exerciseType,
  exercisePrompt,
  answer,
  onAnswerChange,
  onSubmit,
  isGrading,
  error,
}: ReviewExerciseCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isSingleLine = exerciseType === "fill-in-blank";

  useEffect(() => {
    // Auto-focus input when exercise loads
    if (isSingleLine) {
      inputRef.current?.focus();
    } else {
      textareaRef.current?.focus();
    }
  }, [isSingleLine, exercisePrompt]);

  const exerciseInfo = EXERCISE_CONFIG[exerciseType] ?? {
    label: exerciseType.replace(/-/g, " "),
    icon: Sparkles,
    color: "bg-muted text-muted-foreground border-border",
  };
  const ExerciseIcon = exerciseInfo.icon;

  const sourceLabel =
    item.source === "correction"
      ? `${item.correction?.errorType ?? "grammar"} correction`
      : "vocabulary item";

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isSingleLine) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (answer.trim().length > 0 && !isGrading) {
          onSubmit();
        }
      }
    } else {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (answer.trim().length > 0 && !isGrading) {
          onSubmit();
        }
      }
    }
  };

  return (
    <Card className="max-w-2xl mx-auto border-border/80 bg-card/95 shadow-lg backdrop-blur-sm transition-all duration-300">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`gap-1.5 px-2.5 py-1 text-xs font-medium ${exerciseInfo.color}`}
            >
              <ExerciseIcon className="size-3.5" />
              <span className="capitalize">{exerciseInfo.label}</span>
            </Badge>
            <Badge
              variant="secondary"
              className="text-[11px] font-normal text-muted-foreground"
            >
              {sourceLabel}
            </Badge>
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <span>Interval:</span>
            <span className="font-medium text-foreground">
              {item.interval === 0 ? "New" : `${item.interval}d`}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Exercise Prompt */}
        <div className="rounded-xl bg-muted/40 p-5 border border-border/50">
          <p className="text-base sm:text-lg font-medium leading-relaxed tracking-tight text-foreground whitespace-pre-wrap">
            {exercisePrompt}
          </p>
        </div>

        {/* Input Area */}
        <div className="space-y-2">
          <label
            htmlFor="exercise-answer"
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Your Answer
          </label>

          {isSingleLine ? (
            <Input
              id="exercise-answer"
              ref={inputRef}
              value={answer}
              onChange={(e) => onAnswerChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isGrading}
              placeholder="Type your answer here..."
              className="text-base py-5 px-4 rounded-xl border-border/80 focus-visible:ring-2 focus-visible:ring-primary shadow-xs"
              autoComplete="off"
              autoFocus
            />
          ) : (
            <Textarea
              id="exercise-answer"
              ref={textareaRef}
              value={answer}
              onChange={(e) => onAnswerChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isGrading}
              placeholder="Write your response here..."
              className="min-h-[120px] text-base p-4 rounded-xl border-border/80 focus-visible:ring-2 focus-visible:ring-primary leading-relaxed shadow-xs"
              autoFocus
            />
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1.5">
              {isSingleLine ? (
                <>
                  Press{" "}
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono shadow-xs">
                    ⏎ Enter
                  </kbd>{" "}
                  to submit
                </>
              ) : (
                <>
                  Press{" "}
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono shadow-xs">
                    ⌘/Ctrl + ⏎
                  </kbd>{" "}
                  to submit
                </>
              )}
            </span>
            <span>{answer.trim().length} characters</span>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="py-2.5">
            <AlertCircle className="size-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="pt-2 pb-5 flex items-center justify-end gap-3 border-t border-border/50 bg-muted/10">
        <Button
          size="lg"
          onClick={onSubmit}
          disabled={answer.trim().length === 0 || isGrading}
          className="font-medium shadow-xs px-6"
        >
          {isGrading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Grading Answer...
            </>
          ) : (
            <>
              Submit Answer
              <CornerDownLeft className="ml-2 size-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
