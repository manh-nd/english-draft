"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Star, Trash2, BookOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import type { CorrectionWithDocument } from "@/lib/db/corrections";

interface CorrectionBankClientProps {
  initialCorrections: CorrectionWithDocument[];
}

const ERROR_TYPE_LABELS: Record<string, string> = {
  grammar: "Grammar",
  style: "Style",
  vocabulary: "Vocabulary",
};

const ERROR_TYPE_COLORS: Record<string, string> = {
  grammar: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  style:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  vocabulary:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

type ErrorTypeFilter = "all" | "grammar" | "style" | "vocabulary";

export function CorrectionBankClient({
  initialCorrections,
}: CorrectionBankClientProps) {
  const [corrections, setCorrections] =
    useState<CorrectionWithDocument[]>(initialCorrections);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [errorTypeFilter, setErrorTypeFilter] =
    useState<ErrorTypeFilter>("all");
  const [starredOnly, setStarredOnly] = useState(false);
  const [dateSortAsc, setDateSortAsc] = useState(false); // false = newest first (default)

  const setIdPending = (id: string, pending: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleToggleStar = useCallback(async (id: string) => {
    setIdPending(id, true);
    try {
      const res = await fetch(`/api/corrections/${id}`, { method: "PATCH" });
      if (!res.ok) return;
      const updated = (await res.json()) as CorrectionWithDocument;
      setCorrections((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } finally {
      setIdPending(id, false);
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setIdPending(id, true);
    try {
      const res = await fetch(`/api/corrections/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setCorrections((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setIdPending(id, false);
    }
  }, []);

  const filtered = useMemo(() => {
    const list = corrections.filter((c) => {
      if (starredOnly && !c.starred) return false;
      if (errorTypeFilter !== "all" && c.errorType !== errorTypeFilter)
        return false;
      return true;
    });
    return dateSortAsc
      ? [...list].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      : list; // already ordered newest-first by the DB query
  }, [corrections, errorTypeFilter, starredOnly, dateSortAsc]);

  if (corrections.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpen />
          </EmptyMedia>
          <EmptyTitle>No corrections yet</EmptyTitle>
          <EmptyDescription>
            Accept an AI Inline Suggestion in any document — it will be saved
            here automatically.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const filterTypes: Array<{ value: ErrorTypeFilter; label: string }> = [
    { value: "all", label: "All" },
    { value: "grammar", label: "Grammar" },
    { value: "style", label: "Style" },
    { value: "vocabulary", label: "Vocabulary" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border bg-muted p-1">
          {filterTypes.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setErrorTypeFilter(value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                errorTypeFilter === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setStarredOnly((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            starredOnly
              ? "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Star
            className={`size-3 ${starredOnly ? "fill-amber-400 text-amber-400" : ""}`}
          />
          Starred only
        </button>
        <button
          onClick={() => setDateSortAsc((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          aria-label={
            dateSortAsc ? "Sorted: oldest first" : "Sorted: newest first"
          }
        >
          {dateSortAsc ? "↑ Oldest" : "↓ Newest"}
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No corrections match the current filters.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((correction) => {
            const isPending = pendingIds.has(correction.id);
            return (
              <li
                key={correction.id}
                className="group flex items-start gap-3 rounded-lg border bg-card px-4 py-3"
              >
                <div className="flex-1 overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                        ERROR_TYPE_COLORS[correction.errorType] ?? ""
                      }`}
                    >
                      {ERROR_TYPE_LABELS[correction.errorType] ??
                        correction.errorType}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                      }).format(new Date(correction.createdAt))}
                    </span>
                    {correction.documentId && correction.documentTitle && (
                      <Link
                        href={`/documents/${correction.documentId}`}
                        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <FileText className="size-3" />
                        {correction.documentTitle}
                      </Link>
                    )}
                  </div>
                  <div className="mt-2 flex flex-col gap-1">
                    <p className="text-sm line-through text-muted-foreground">
                      {correction.originalText}
                    </p>
                    <p className="text-sm font-medium">
                      {correction.correctedText}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={isPending}
                    onClick={() => handleToggleStar(correction.id)}
                    aria-label={
                      correction.starred ? "Unstar" : "Star correction"
                    }
                  >
                    <Star
                      className={`size-3.5 ${
                        correction.starred
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    disabled={isPending}
                    onClick={() => handleDelete(correction.id)}
                    aria-label="Delete correction"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
