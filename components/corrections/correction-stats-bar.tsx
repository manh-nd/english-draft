"use client";

import { Star, CheckCircle2, BookMarked, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CorrectionStatsBarProps {
  totalCount: number;
  starredCount: number;
  grammarCount: number;
  styleCount: number;
  vocabularyCount: number;
  activeFilter: string;
  starredOnly: boolean;
  onSelectFilter: (filter: "all" | "grammar" | "style" | "vocabulary") => void;
  onToggleStarredOnly: () => void;
}

export function CorrectionStatsBar({
  totalCount,
  starredCount,
  grammarCount,
  styleCount,
  vocabularyCount,
  activeFilter,
  starredOnly,
  onSelectFilter,
  onToggleStarredOnly,
}: CorrectionStatsBarProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {/* Total Card */}
      <button
        type="button"
        onClick={() => onSelectFilter("all")}
        className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all hover:border-primary/50 ${
          activeFilter === "all" && !starredOnly
            ? "border-primary bg-primary/5 shadow-xs"
            : "bg-card"
        }`}
      >
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">Total Saved</span>
          <CheckCircle2 className="size-4 text-primary" />
        </div>
        <span className="text-2xl font-bold tracking-tight">{totalCount}</span>
        <span className="text-[11px] text-muted-foreground">
          All corrections
        </span>
      </button>

      {/* Starred Card */}
      <button
        type="button"
        onClick={onToggleStarredOnly}
        className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all hover:border-amber-400/60 ${
          starredOnly
            ? "border-amber-400 bg-amber-500/10 shadow-xs dark:bg-amber-950/30"
            : "bg-card"
        }`}
      >
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">Starred</span>
          <Star
            className={`size-4 ${
              starredCount > 0
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground"
            }`}
          />
        </div>
        <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
          {starredCount}
        </span>
        <span className="text-[11px] text-muted-foreground">
          Priority review
        </span>
      </button>

      {/* Grammar Card */}
      <button
        type="button"
        onClick={() => onSelectFilter("grammar")}
        className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all hover:border-sky-400/60 ${
          activeFilter === "grammar"
            ? "border-sky-500 bg-sky-500/10 shadow-xs dark:bg-sky-950/30"
            : "bg-card"
        }`}
      >
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">Grammar</span>
          <Badge
            variant="secondary"
            className="h-4 rounded-full bg-sky-500/15 px-1.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300"
          >
            Fix
          </Badge>
        </div>
        <span className="text-2xl font-bold tracking-tight text-sky-700 dark:text-sky-300">
          {grammarCount}
        </span>
        <span className="text-[11px] text-muted-foreground">
          Syntax & tense
        </span>
      </button>

      {/* Style Card */}
      <button
        type="button"
        onClick={() => onSelectFilter("style")}
        className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all hover:border-violet-400/60 ${
          activeFilter === "style"
            ? "border-violet-500 bg-violet-500/10 shadow-xs dark:bg-violet-950/30"
            : "bg-card"
        }`}
      >
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">Style</span>
          <Sparkles className="size-3.5 text-violet-500" />
        </div>
        <span className="text-2xl font-bold tracking-tight text-violet-700 dark:text-violet-300">
          {styleCount}
        </span>
        <span className="text-[11px] text-muted-foreground">Flow & tone</span>
      </button>

      {/* Vocabulary Card */}
      <button
        type="button"
        onClick={() => onSelectFilter("vocabulary")}
        className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all hover:border-amber-400/60 ${
          activeFilter === "vocabulary"
            ? "border-amber-500 bg-amber-500/10 shadow-xs dark:bg-amber-950/30"
            : "bg-card"
        }`}
      >
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">Vocabulary</span>
          <BookMarked className="size-3.5 text-amber-500" />
        </div>
        <span className="text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-300">
          {vocabularyCount}
        </span>
        <span className="text-[11px] text-muted-foreground">Word choice</span>
      </button>
    </div>
  );
}
