"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Star,
  Trash2,
  FileText,
  Copy,
  Check,
  ArrowRight,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSrsStatus } from "@/lib/vocabulary-utils";
import type { CorrectionWithDocument } from "@/lib/db/corrections";

interface CorrectionCardProps {
  correction: CorrectionWithDocument;
  isPending: boolean;
  onToggleStar: (id: string) => void;
  onDelete: (id: string) => void;
}

const ERROR_TYPE_CONFIG: Record<string, { label: string; badgeClass: string }> =
  {
    grammar: {
      label: "Grammar",
      badgeClass:
        "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    },
    style: {
      label: "Style",
      badgeClass:
        "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
    },
    vocabulary: {
      label: "Vocabulary",
      badgeClass:
        "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    },
  };

export function CorrectionCard({
  correction,
  isPending,
  onToggleStar,
  onDelete,
}: CorrectionCardProps) {
  const [copied, setCopied] = useState(false);
  const [showContext, setShowContext] = useState(false);

  const errorConfig = ERROR_TYPE_CONFIG[correction.errorType] ?? {
    label: correction.errorType,
    badgeClass: "bg-muted text-muted-foreground",
  };

  const srsStatus = getSrsStatus(correction.reviewItem);

  const handleCopy = () => {
    navigator.clipboard.writeText(correction.correctedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(correction.createdAt));

  return (
    <li className="group flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs transition-all hover:border-primary/30 hover:shadow-sm">
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {/* Error Type Badge */}
          <Badge
            variant="outline"
            className={`text-[11px] font-semibold tracking-wide ${errorConfig.badgeClass}`}
          >
            {errorConfig.label}
          </Badge>

          {/* Date */}
          <span className="text-xs text-muted-foreground">{formattedDate}</span>

          {/* Source Document Link */}
          {correction.documentId && correction.documentTitle && (
            <Link
              href={`/documents/${correction.documentId}`}
              className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Open source document"
            >
              <FileText className="size-3 shrink-0" />
              <span className="max-w-[140px] truncate sm:max-w-[200px]">
                {correction.documentTitle}
              </span>
            </Link>
          )}

          {/* SRS Status Badge */}
          {correction.reviewItem && (
            <Badge
              variant="outline"
              className={`hidden text-[10px] sm:inline-flex ${srsStatus.badgeClass}`}
            >
              <Clock className="mr-1 size-3" />
              {srsStatus.label}
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            onClick={handleCopy}
            aria-label="Copy corrected text"
            title={copied ? "Copied!" : "Copy corrected text"}
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`size-7 transition-colors ${
              correction.starred
                ? "text-amber-500 hover:text-amber-600"
                : "text-muted-foreground hover:text-amber-500"
            }`}
            disabled={isPending}
            onClick={() => onToggleStar(correction.id)}
            aria-label={
              correction.starred ? "Unstar correction" : "Star correction"
            }
            title={
              correction.starred
                ? "Starred for priority review"
                : "Star for priority review"
            }
          >
            <Star
              className={`size-3.5 ${
                correction.starred ? "fill-amber-400 text-amber-400" : ""
              }`}
            />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 hover:text-destructive"
            disabled={isPending}
            onClick={() => onDelete(correction.id)}
            aria-label="Delete correction"
            title="Delete correction"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Diff View Comparison Card */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {/* Original Text (Red / Strikethrough) */}
        <div className="flex flex-col gap-1 rounded-lg border border-red-500/20 bg-red-500/10 p-3 dark:bg-red-950/30">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 select-none">
            <span>Original</span>
            <span className="line-through opacity-70">Removed</span>
          </div>
          <p className="text-xs sm:text-sm font-mono text-red-700 dark:text-red-300 line-through decoration-red-500/70 break-words leading-relaxed">
            {correction.originalText}
          </p>
        </div>

        {/* Suggested Text (Emerald / Highlight) */}
        <div className="flex flex-col gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 select-none">
            <span className="flex items-center gap-1">
              Suggested <ArrowRight className="size-3 inline" />
            </span>
            <span className="font-bold">Corrected</span>
          </div>
          <p className="text-xs sm:text-sm font-mono font-medium text-emerald-800 dark:text-emerald-200 break-words leading-relaxed">
            {correction.correctedText}
          </p>
        </div>
      </div>

      {/* Context Accordion (if available) */}
      {correction.context && (
        <div className="mt-0.5 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setShowContext((v) => !v)}
            className="flex items-center gap-1.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {showContext ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
            <span>{showContext ? "Hide" : "Show"} Document Context</span>
          </button>
          {showContext && (
            <div className="rounded-lg border bg-muted/40 p-2.5 text-xs text-muted-foreground italic leading-relaxed animate-in fade-in duration-150">
              &ldquo;{correction.context}&rdquo;
            </div>
          )}
        </div>
      )}
    </li>
  );
}
