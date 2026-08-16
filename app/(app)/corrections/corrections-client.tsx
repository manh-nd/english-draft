"use client";

import { useState, useCallback } from "react";
import { Star, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import type { Correction } from "@/lib/db/corrections";

interface CorrectionBankClientProps {
  initialCorrections: Correction[];
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

export function CorrectionBankClient({
  initialCorrections,
}: CorrectionBankClientProps) {
  const [corrections, setCorrections] =
    useState<Correction[]>(initialCorrections);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

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
      const updated = (await res.json()) as Correction;
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

  const starred = corrections.filter((c) => c.starred);
  const unstarred = corrections.filter((c) => !c.starred);

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

  return (
    <div className="flex flex-col gap-6">
      {starred.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Starred ({starred.length})
          </h2>
          <CorrectionList
            corrections={starred}
            pendingIds={pendingIds}
            onToggleStar={handleToggleStar}
            onDelete={handleDelete}
          />
        </section>
      )}

      {unstarred.length > 0 && (
        <section>
          {starred.length > 0 && (
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              All corrections ({unstarred.length})
            </h2>
          )}
          <CorrectionList
            corrections={unstarred}
            pendingIds={pendingIds}
            onToggleStar={handleToggleStar}
            onDelete={handleDelete}
          />
        </section>
      )}
    </div>
  );
}

function CorrectionList({
  corrections,
  pendingIds,
  onToggleStar,
  onDelete,
}: {
  corrections: Correction[];
  pendingIds: Set<string>;
  onToggleStar: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {corrections.map((correction) => {
        const isPending = pendingIds.has(correction.id);
        return (
          <li
            key={correction.id}
            className="group flex items-start gap-3 rounded-lg border bg-card px-4 py-3"
          >
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-2">
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
                onClick={() => onToggleStar(correction.id)}
                aria-label={correction.starred ? "Unstar" : "Star correction"}
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
                onClick={() => onDelete(correction.id)}
                aria-label="Delete correction"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
