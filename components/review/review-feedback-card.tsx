"use client";

import { useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Calendar,
  ArrowRight,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

interface ReviewFeedbackCardProps {
  rating: number;
  feedback: string;
  userAnswer: string;
  nextReviewAt?: string;
  isLastItem: boolean;
  onNext: () => void;
}

interface RatingVisual {
  label: string;
  color: string;
  badgeBg: string;
  icon: typeof CheckCircle2;
  textColor: string;
}

const RATING_VISUALS: Record<number, RatingVisual> = {
  5: {
    label: "Perfect!",
    color: "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20",
    badgeBg: "bg-emerald-500 text-white dark:bg-emerald-600",
    icon: Sparkles,
    textColor: "text-emerald-600 dark:text-emerald-400",
  },
  4: {
    label: "Good",
    color: "border-green-500/30 bg-green-500/5 dark:bg-green-950/20",
    badgeBg: "bg-green-600 text-white dark:bg-green-600",
    icon: CheckCircle2,
    textColor: "text-green-600 dark:text-green-400",
  },
  3: {
    label: "OK",
    color: "border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20",
    badgeBg: "bg-amber-500 text-white dark:bg-amber-600",
    icon: AlertTriangle,
    textColor: "text-amber-600 dark:text-amber-400",
  },
  2: {
    label: "Needs Work",
    color: "border-orange-500/30 bg-orange-500/5 dark:bg-orange-950/20",
    badgeBg: "bg-orange-500 text-white dark:bg-orange-600",
    icon: AlertTriangle,
    textColor: "text-orange-600 dark:text-orange-400",
  },
  1: {
    label: "Incorrect",
    color: "border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20",
    badgeBg: "bg-rose-500 text-white dark:bg-rose-600",
    icon: XCircle,
    textColor: "text-rose-600 dark:text-rose-400",
  },
  0: {
    label: "No Attempt",
    color: "border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20",
    badgeBg: "bg-rose-500 text-white dark:bg-rose-600",
    icon: XCircle,
    textColor: "text-rose-600 dark:text-rose-400",
  },
};

function formatNextReview(dateString?: string): string {
  if (!dateString) return "Scheduled for future review";
  try {
    const target = new Date(dateString);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) return "Tomorrow";
    if (diffDays < 7) return `In ${diffDays} days`;
    if (diffDays < 30) return `In ${Math.round(diffDays / 7)} weeks`;
    return `In ${Math.round(diffDays / 30)} months`;
  } catch {
    return "Scheduled for future review";
  }
}

export function ReviewFeedbackCard({
  rating,
  feedback,
  userAnswer,
  nextReviewAt,
  isLastItem,
  onNext,
}: ReviewFeedbackCardProps) {
  const visual = RATING_VISUALS[rating] ?? RATING_VISUALS[0];
  const VisualIcon = visual.icon;

  // Keyboard shortcut: Press Enter to proceed to next item
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNext]);

  return (
    <Card
      className={`max-w-2xl mx-auto border shadow-lg backdrop-blur-sm transition-all duration-300 ${visual.color}`}
    >
      <CardHeader className="pb-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${visual.badgeBg}`}>
              <VisualIcon className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-bold ${visual.textColor}`}>
                  {visual.label}
                </span>
                <Badge
                  variant="outline"
                  className="text-xs font-mono font-semibold"
                >
                  {rating}/5
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                SM-2 Evaluation Result
              </p>
            </div>
          </div>

          {nextReviewAt && (
            <Badge
              variant="secondary"
              className="gap-1.5 px-3 py-1 text-xs font-normal"
            >
              <Calendar className="size-3.5 text-muted-foreground" />
              <span>Next review: {formatNextReview(nextReviewAt)}</span>
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-4">
        {/* User Answer recap */}
        <div className="rounded-lg border bg-background/60 p-3.5 space-y-1">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Your Response
          </div>
          <p className="text-sm font-medium text-foreground">{userAnswer}</p>
        </div>

        {/* AI Feedback & Explanation */}
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            Feedback & Explanation
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {feedback}
          </p>
        </div>
      </CardContent>

      <CardFooter className="pt-2 pb-5 flex items-center justify-between border-t border-border/40 bg-background/40">
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          Press{" "}
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono shadow-xs">
            ⏎ Enter
          </kbd>{" "}
          to continue
        </span>

        <Button
          size="lg"
          onClick={onNext}
          className="font-medium shadow-xs px-6"
        >
          {isLastItem ? (
            <>
              Finish Review Session
              <Trophy className="ml-2 size-4" />
            </>
          ) : (
            <>
              Next Exercise
              <ArrowRight className="ml-2 size-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
