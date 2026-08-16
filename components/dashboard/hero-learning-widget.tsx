import {
  BrainCircuit,
  BookOpen,
  BookMarked,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface HeroLearningWidgetProps {
  dueCount: number;
  totalVocabulary: number;
  totalCorrections: number;
}

export function HeroLearningWidget({
  dueCount,
  totalVocabulary,
  totalCorrections,
}: HeroLearningWidgetProps) {
  const isCaughtUp = dueCount === 0;

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm">
      <CardContent className="flex flex-col gap-6 p-6">
        {/* Top Hero Row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BrainCircuit className="size-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  Daily Spaced Repetition
                </h2>
                {isCaughtUp ? (
                  <Badge
                    variant="secondary"
                    className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs"
                  >
                    <CheckCircle2 className="size-3" /> Caught Up
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-xs">
                    {dueCount} Due Today
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground max-w-xl">
                {isCaughtUp
                  ? "All daily review items are complete! Keep drafting new texts or browse your learning bank to strengthen retention."
                  : "Strengthen your English retention through AI-generated exercises adapted from your own mistakes and saved words."}
              </p>
            </div>
          </div>

          {/* Action CTA */}
          <div className="flex shrink-0 items-center gap-2 sm:self-center">
            {isCaughtUp ? (
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link href="/review">
                  Review anyway
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="default" className="gap-2 shadow-sm">
                <Link href="/review">
                  <BrainCircuit className="size-4" />
                  Start Daily Review ({dueCount})
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4 border-t border-border/60">
          <Link
            href="/review"
            className="group flex flex-col rounded-lg bg-background/60 p-3 transition-colors hover:bg-accent/60"
          >
            <span className="text-xs text-muted-foreground">
              Due for Review
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight">
                {dueCount}
              </span>
              <span className="text-xs text-muted-foreground">items</span>
            </div>
          </Link>

          <Link
            href="/vocabulary"
            className="group flex flex-col rounded-lg bg-background/60 p-3 transition-colors hover:bg-accent/60"
          >
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <BookOpen className="size-3" /> Saved Vocabulary
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight">
                {totalVocabulary}
              </span>
              <span className="text-xs text-muted-foreground">words</span>
            </div>
          </Link>

          <Link
            href="/corrections"
            className="group flex flex-col rounded-lg bg-background/60 p-3 transition-colors hover:bg-accent/60"
          >
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <BookMarked className="size-3" /> Correction Bank
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight">
                {totalCorrections}
              </span>
              <span className="text-xs text-muted-foreground">fixes</span>
            </div>
          </Link>

          <div className="flex flex-col rounded-lg bg-background/60 p-3">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="size-3 text-amber-500" /> Learning Focus
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-sm font-semibold text-foreground">
                {dueCount > 0 ? "Review Required" : "Ready to Draft"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
