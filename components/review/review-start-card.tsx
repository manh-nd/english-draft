"use client";

import { useEffect } from "react";
import {
  BrainCircuit,
  BookOpen,
  Sparkles,
  PenTool,
  Clock,
  Zap,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { ReviewItemWithSource } from "@/lib/db/review";

interface ReviewStartCardProps {
  dueItems: ReviewItemWithSource[];
  onStart: () => void;
}

export function ReviewStartCard({ dueItems, onStart }: ReviewStartCardProps) {
  // Listen for Enter key to quickly start session
  useEffect(() => {
    if (dueItems.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        // Prevent default if target is not an input/textarea
        if (
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA"
        ) {
          e.preventDefault();
          onStart();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dueItems.length, onStart]);

  if (dueItems.length === 0) {
    return (
      <Empty className="border rounded-2xl bg-card/60 backdrop-blur-sm p-8 max-w-lg mx-auto shadow-sm">
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className="bg-primary/10 text-primary p-4 rounded-2xl"
          >
            <CheckCircle2 className="size-8 text-primary" />
          </EmptyMedia>
          <EmptyTitle className="text-xl font-semibold mt-3">
            All caught up!
          </EmptyTitle>
          <EmptyDescription className="text-muted-foreground text-sm max-w-sm mt-1">
            You don&apos;t have any items due for review right now. Keep writing
            in your documents to collect new corrections and vocabulary!
          </EmptyDescription>
        </EmptyHeader>
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/">Back to Dashboard</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/documents">Open Editor</Link>
          </Button>
        </div>
      </Empty>
    );
  }

  // Count items by category
  const grammarCount = dueItems.filter(
    (item) =>
      item.source === "correction" && item.correction?.errorType === "grammar"
  ).length;
  const vocabCount = dueItems.filter(
    (item) => item.source === "vocabulary_item"
  ).length;
  const styleCount = dueItems.filter(
    (item) =>
      item.source === "correction" && item.correction?.errorType === "style"
  ).length;
  const otherCount = dueItems.length - grammarCount - vocabCount - styleCount;

  const estimatedMinutes = Math.max(1, Math.ceil(dueItems.length * 0.8));

  return (
    <Card className="max-w-xl mx-auto border-border/80 bg-card/90 shadow-md backdrop-blur-sm transition-all">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BrainCircuit className="size-6" />
          </div>
          <Badge
            variant="secondary"
            className="gap-1.5 px-2.5 py-1 text-xs font-normal"
          >
            <Clock className="size-3.5 text-muted-foreground" />~
            {estimatedMinutes} min session
          </Badge>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight mt-3">
          Daily Review Session
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Strengthen your active recall with AI-generated exercises. Type your
          answers to advance your Spaced Repetition mastery.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Category Breakdown */}
        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Items Due Today ({dueItems.length})
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {grammarCount > 0 && (
              <div className="flex items-center gap-2.5 rounded-lg border bg-background/80 p-2.5">
                <PenTool className="size-4 text-sky-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Grammar</div>
                  <div className="text-sm font-semibold">
                    {grammarCount} items
                  </div>
                </div>
              </div>
            )}
            {vocabCount > 0 && (
              <div className="flex items-center gap-2.5 rounded-lg border bg-background/80 p-2.5">
                <BookOpen className="size-4 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">
                    Vocabulary
                  </div>
                  <div className="text-sm font-semibold">
                    {vocabCount} items
                  </div>
                </div>
              </div>
            )}
            {styleCount > 0 && (
              <div className="flex items-center gap-2.5 rounded-lg border bg-background/80 p-2.5">
                <Sparkles className="size-4 text-purple-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Style</div>
                  <div className="text-sm font-semibold">
                    {styleCount} items
                  </div>
                </div>
              </div>
            )}
            {otherCount > 0 && (
              <div className="flex items-center gap-2.5 rounded-lg border bg-background/80 p-2.5">
                <Zap className="size-4 text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Other</div>
                  <div className="text-sm font-semibold">
                    {otherCount} items
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-[11px]">
              1
            </span>
            <span>
              <strong>Active Recall:</strong> Type full words or sentences
              rather than passive guessing.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-[11px]">
              2
            </span>
            <span>
              <strong>Instant Grading:</strong> Real-time AI evaluation with
              SM-2 interval scheduling.
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t bg-muted/10">
        <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5">
          Press{" "}
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono shadow-xs">
            ⏎ Enter
          </kbd>{" "}
          to begin
        </span>
        <Button
          size="lg"
          className="w-full sm:w-auto font-medium shadow-xs"
          onClick={onStart}
        >
          Start Zen Review
          <ArrowRight className="ml-1.5 size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
