"use client";

import { useEffect } from "react";
import {
  Trophy,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  RotateCcw,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface SessionSummaryStats {
  totalReviewed: number;
  averageRating: number;
  perfectCount: number;
  accuracyPercent: number;
}

interface ReviewCelebrationCardProps {
  stats: SessionSummaryStats;
  onRestart?: () => void;
}

export function ReviewCelebrationCard({
  stats,
  onRestart,
}: ReviewCelebrationCardProps) {
  // Listen for Enter key to return to dashboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // If user presses enter on celebration screen, redirect to dashboard
        const dashboardBtn = document.getElementById(
          "celebration-dashboard-btn"
        );
        if (dashboardBtn) {
          dashboardBtn.click();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Card className="max-w-xl mx-auto border-border/80 bg-card/95 shadow-xl backdrop-blur-sm overflow-hidden text-center">
      {/* Decorative gradient top accent */}
      <div className="h-2 w-full bg-gradient-to-r from-primary via-emerald-500 to-sky-500" />

      <CardHeader className="pt-8 pb-4">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner mb-3">
          <Trophy className="size-8 text-primary animate-bounce duration-1000" />
        </div>
        <Badge
          variant="secondary"
          className="mx-auto gap-1.5 px-3 py-1 text-xs"
        >
          <Sparkles className="size-3.5 text-primary" />
          Great Practice Today!
        </Badge>
        <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight mt-2">
          Session Complete!
        </CardTitle>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
          You&apos;ve completed all due review items. Your memory intervals have
          been updated in the Spaced Repetition engine.
        </p>
      </CardHeader>

      <CardContent className="space-y-6 pt-2">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border bg-muted/40 p-3.5 text-center">
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-1">
              <CheckCircle2 className="size-3.5 text-primary" />
              Reviewed
            </div>
            <div className="text-2xl font-bold text-foreground">
              {stats.totalReviewed}
            </div>
            <div className="text-[11px] text-muted-foreground">items total</div>
          </div>

          <div className="rounded-xl border bg-muted/40 p-3.5 text-center">
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="size-3.5 text-emerald-500" />
              Accuracy
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.accuracyPercent}%
            </div>
            <div className="text-[11px] text-muted-foreground">
              {stats.averageRating.toFixed(1)} / 5.0 avg
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-xl border bg-muted/40 p-3.5 text-center">
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-1">
              <Sparkles className="size-3.5 text-amber-500" />
              Perfect
            </div>
            <div className="text-2xl font-bold text-foreground">
              {stats.perfectCount}
            </div>
            <div className="text-[11px] text-muted-foreground">
              5-star responses
            </div>
          </div>
        </div>

        {/* Motivational Tip */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground flex items-start gap-3 text-left">
          <BookOpen className="size-4 text-primary shrink-0 mt-0.5" />
          <span>
            Daily consistent reviews yield 80%+ long-term retention. Check your
            dashboard tomorrow for new due items or draft a new document today!
          </span>
        </div>
      </CardContent>

      <CardFooter className="pt-2 pb-6 flex flex-col sm:flex-row items-center justify-center gap-3 border-t border-border/50 bg-muted/10">
        {onRestart && (
          <Button
            variant="outline"
            size="lg"
            onClick={onRestart}
            className="w-full sm:w-auto"
          >
            <RotateCcw className="mr-2 size-4" />
            Restart Session
          </Button>
        )}

        <Button
          id="celebration-dashboard-btn"
          size="lg"
          asChild
          className="w-full sm:w-auto font-medium shadow-xs"
        >
          <Link href="/">
            Back to Dashboard
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
