"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { BookOpen, Sparkles, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { CorrectionStatsBar } from "./correction-stats-bar";
import { CorrectionFilters, type ErrorTypeFilter } from "./correction-filters";
import { CorrectionCard } from "./correction-card";
import type { CorrectionWithDocument } from "@/lib/db/corrections";

interface CorrectionBankProps {
  initialCorrections: CorrectionWithDocument[];
}

export function CorrectionBank({ initialCorrections }: CorrectionBankProps) {
  const [corrections, setCorrections] =
    useState<CorrectionWithDocument[]>(initialCorrections);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [errorTypeFilter, setErrorTypeFilter] =
    useState<ErrorTypeFilter>("all");
  const [starredOnly, setStarredOnly] = useState(false);
  const [dateSortAsc, setDateSortAsc] = useState(false);

  const setIdPending = (id: string, pending: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleToggleStar = useCallback(async (id: string) => {
    // Optimistic UI update
    setCorrections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, starred: !c.starred } : c))
    );
    setIdPending(id, true);

    try {
      const res = await fetch(`/api/corrections/${id}`, { method: "PATCH" });
      if (!res.ok) {
        // Rollback on failure
        setCorrections((prev) =>
          prev.map((c) => (c.id === id ? { ...c, starred: !c.starred } : c))
        );
      } else {
        const updated = (await res.json()) as CorrectionWithDocument;
        setCorrections((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, starred: updated.starred } : c
          )
        );
      }
    } catch {
      // Rollback on network error
      setCorrections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, starred: !c.starred } : c))
      );
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

  // Compute category statistics
  const stats = useMemo(() => {
    let starred = 0;
    let grammar = 0;
    let style = 0;
    let vocabulary = 0;

    for (const c of corrections) {
      if (c.starred) starred++;
      if (c.errorType === "grammar") grammar++;
      else if (c.errorType === "style") style++;
      else if (c.errorType === "vocabulary") vocabulary++;
    }

    return {
      total: corrections.length,
      starred,
      grammar,
      style,
      vocabulary,
    };
  }, [corrections]);

  // Filter and sort corrections
  const filteredCorrections = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const list = corrections.filter((c) => {
      if (starredOnly && !c.starred) return false;
      if (errorTypeFilter !== "all" && c.errorType !== errorTypeFilter)
        return false;

      if (q) {
        const matchOriginal = c.originalText.toLowerCase().includes(q);
        const matchCorrected = c.correctedText.toLowerCase().includes(q);
        const matchContext = c.context?.toLowerCase().includes(q) ?? false;
        const matchDoc = c.documentTitle?.toLowerCase().includes(q) ?? false;
        if (!matchOriginal && !matchCorrected && !matchContext && !matchDoc) {
          return false;
        }
      }

      return true;
    });

    return dateSortAsc
      ? [...list].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      : list;
  }, [corrections, searchQuery, errorTypeFilter, starredOnly, dateSortAsc]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setErrorTypeFilter("all");
    setStarredOnly(false);
  };

  if (corrections.length === 0) {
    return (
      <Empty className="my-8 border rounded-2xl bg-card/60 p-8 shadow-xs">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpen className="size-8 text-primary" />
          </EmptyMedia>
          <EmptyTitle>No corrections in bank yet</EmptyTitle>
          <EmptyDescription className="max-w-md">
            When you accept an AI Inline Suggestion while drafting in the
            editor, it is automatically logged here with a side-by-side diff and
            scheduled for Spaced Repetition review.
          </EmptyDescription>
          <div className="mt-4 flex items-center gap-2">
            <Button asChild size="sm">
              <Link href="/documents">
                <PlusCircle className="mr-1.5 size-4" />
                Go to Documents
              </Link>
            </Button>
          </div>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Counter Bar */}
      <CorrectionStatsBar
        totalCount={stats.total}
        starredCount={stats.starred}
        grammarCount={stats.grammar}
        styleCount={stats.style}
        vocabularyCount={stats.vocabulary}
        activeFilter={errorTypeFilter}
        starredOnly={starredOnly}
        onSelectFilter={(filter) => {
          setErrorTypeFilter(filter);
          setStarredOnly(false);
        }}
        onToggleStarredOnly={() => setStarredOnly((v) => !v)}
      />

      {/* Filter and Search Controls */}
      <CorrectionFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        errorTypeFilter={errorTypeFilter}
        onErrorTypeFilterChange={setErrorTypeFilter}
        starredOnly={starredOnly}
        onStarredOnlyToggle={() => setStarredOnly((v) => !v)}
        dateSortAsc={dateSortAsc}
        onDateSortToggle={() => setDateSortAsc((v) => !v)}
        totalFiltered={filteredCorrections.length}
      />

      {/* Cards List */}
      {filteredCorrections.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center bg-card/40">
          <Sparkles className="size-8 text-muted-foreground/60 mb-2" />
          <h3 className="text-sm font-semibold">No matching corrections</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            No corrections found matching &ldquo;
            {searchQuery || errorTypeFilter}&rdquo;. Try adjusting your search
            query or filters.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="mt-4 text-xs"
          >
            Reset all filters
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filteredCorrections.map((correction) => (
            <CorrectionCard
              key={correction.id}
              correction={correction}
              isPending={pendingIds.has(correction.id)}
              onToggleStar={handleToggleStar}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
