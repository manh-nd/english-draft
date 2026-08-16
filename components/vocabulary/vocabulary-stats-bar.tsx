"use client";

import Link from "next/link";
import { BookOpen, Clock, Award, Flame, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface VocabularyStatsBarProps {
  totalCount: number;
  dueCount: number;
  masteredCount: number;
  learningCount: number;
  activeFilter: string;
  onSelectFilter: (filter: "all" | "due" | "learning" | "mastered") => void;
  onOpenAddDialog: () => void;
}

export function VocabularyStatsBar({
  totalCount,
  dueCount,
  masteredCount,
  learningCount,
  activeFilter,
  onSelectFilter,
  onOpenAddDialog,
}: VocabularyStatsBarProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Top Banner Action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vocabulary Bank</h1>
          <p className="text-sm text-muted-foreground">
            Curated words, phrases, and idioms saved for Spaced Repetition
            mastery.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dueCount > 0 && (
            <Button
              asChild
              variant="default"
              size="sm"
              className="gap-1.5 font-medium shadow-xs"
            >
              <Link href="/review">
                <Clock className="size-3.5" />
                <span>Review Due ({dueCount})</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenAddDialog}
            className="gap-1.5 font-medium shadow-xs"
          >
            <Plus className="size-4" />
            Add Word
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Words */}
        <button
          type="button"
          onClick={() => onSelectFilter("all")}
          className={`flex flex-col gap-1 rounded-xl border p-3.5 text-left transition-all hover:border-primary/50 ${
            activeFilter === "all"
              ? "border-primary bg-primary/5 shadow-xs"
              : "bg-card"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Saved</span>
            <BookOpen className="size-4 text-primary" />
          </div>
          <span className="text-2xl font-bold tracking-tight">
            {totalCount}
          </span>
          <span className="text-[11px] text-muted-foreground">
            Words & phrases
          </span>
        </button>

        {/* Due for Review */}
        <button
          type="button"
          onClick={() => onSelectFilter("due")}
          className={`flex flex-col gap-1 rounded-xl border p-3.5 text-left transition-all hover:border-rose-400/60 ${
            activeFilter === "due"
              ? "border-rose-500 bg-rose-500/10 shadow-xs dark:bg-rose-950/30"
              : "bg-card"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Due for Review</span>
            <Badge
              variant="outline"
              className="h-4 border-rose-500/30 bg-rose-500/15 px-1.5 text-[10px] font-semibold text-rose-700 dark:text-rose-300"
            >
              SRS
            </Badge>
          </div>
          <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
            {dueCount}
          </span>
          <span className="text-[11px] text-muted-foreground">
            Ready for recall
          </span>
        </button>

        {/* Learning */}
        <button
          type="button"
          onClick={() => onSelectFilter("learning")}
          className={`flex flex-col gap-1 rounded-xl border p-3.5 text-left transition-all hover:border-amber-400/60 ${
            activeFilter === "learning"
              ? "border-amber-500 bg-amber-500/10 shadow-xs dark:bg-amber-950/30"
              : "bg-card"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">In Progress</span>
            <Flame className="size-4 text-amber-500" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {learningCount}
          </span>
          <span className="text-[11px] text-muted-foreground">
            Interval 1-20 days
          </span>
        </button>

        {/* Mastered */}
        <button
          type="button"
          onClick={() => onSelectFilter("mastered")}
          className={`flex flex-col gap-1 rounded-xl border p-3.5 text-left transition-all hover:border-emerald-400/60 ${
            activeFilter === "mastered"
              ? "border-emerald-500 bg-emerald-500/10 shadow-xs dark:bg-emerald-950/30"
              : "bg-card"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Mastered</span>
            <Award className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {masteredCount}
          </span>
          <span className="text-[11px] text-muted-foreground">
            Interval 21+ days
          </span>
        </button>
      </div>
    </div>
  );
}
