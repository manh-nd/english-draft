"use client";

import { useState, useCallback, useMemo } from "react";
import { BookOpen, Sparkles, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { VocabularyStatsBar } from "./vocabulary-stats-bar";
import {
  VocabularyFilters,
  type VocabularyStatusFilter,
  type VocabularySort,
} from "./vocabulary-filters";
import { VocabularyCard } from "./vocabulary-card";
import { AddVocabularyDialog } from "./add-vocabulary-dialog";
import { getSrsStatus } from "@/lib/vocabulary-utils";
import type { VocabularyItemWithDocument } from "@/lib/db/vocabulary";

interface VocabularyBankProps {
  initialItems: VocabularyItemWithDocument[];
}

export function VocabularyBank({ initialItems }: VocabularyBankProps) {
  const [items, setItems] =
    useState<VocabularyItemWithDocument[]>(initialItems);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<VocabularyStatusFilter>("all");
  const [sort, setSort] = useState<VocabularySort>("newest");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const setIdPending = (id: string, pending: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleDelete = useCallback(async (id: string) => {
    setIdPending(id, true);
    try {
      const res = await fetch(`/api/vocabulary/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setItems((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setIdPending(id, false);
    }
  }, []);

  const handleItemAdded = useCallback((newItem: VocabularyItemWithDocument) => {
    setItems((prev) => [newItem, ...prev]);
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    let due = 0;
    let mastered = 0;
    let learning = 0;

    for (const item of items) {
      const s = getSrsStatus(item.reviewItem);
      if (s.isDue) due++;
      else if (s.variant === "mastered") mastered++;
      else if (s.variant === "learning") learning++;
    }

    return {
      total: items.length,
      due,
      mastered,
      learning,
    };
  }, [items]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const list = items.filter((item) => {
      const s = getSrsStatus(item.reviewItem);

      if (statusFilter === "due" && !s.isDue) return false;
      if (statusFilter === "mastered" && s.variant !== "mastered") return false;
      if (statusFilter === "learning" && s.variant !== "learning") return false;

      if (q) {
        const matchPhrase = item.phrase.toLowerCase().includes(q);
        const matchDef = item.definition?.toLowerCase().includes(q) ?? false;
        const matchEx =
          item.exampleSentence?.toLowerCase().includes(q) ?? false;
        const matchDoc = item.documentTitle?.toLowerCase().includes(q) ?? false;
        if (!matchPhrase && !matchDef && !matchEx && !matchDoc) {
          return false;
        }
      }

      return true;
    });

    if (sort === "alpha") {
      return [...list].sort((a, b) => a.phrase.localeCompare(b.phrase));
    }

    if (sort === "due") {
      return [...list].sort((a, b) => {
        const dateA = a.reviewItem
          ? new Date(a.reviewItem.nextReviewAt).getTime()
          : Infinity;
        const dateB = b.reviewItem
          ? new Date(b.reviewItem.nextReviewAt).getTime()
          : Infinity;
        return dateA - dateB;
      });
    }

    // Default newest first
    return [...list].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [items, searchQuery, statusFilter, sort]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSort("newest");
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <AddVocabularyDialog
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          onItemAdded={handleItemAdded}
        />

        <Empty className="my-8 border rounded-2xl bg-card/60 p-8 shadow-xs">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen className="size-8 text-primary" />
            </EmptyMedia>
            <EmptyTitle>No vocabulary items yet</EmptyTitle>
            <EmptyDescription className="max-w-md">
              Select any word or phrase in the editor and click &apos;Save to
              review&apos;, or add one directly right here to start expanding
              your active vocabulary.
            </EmptyDescription>
            <div className="mt-4 flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => setIsAddOpen(true)}
              >
                <PlusCircle className="mr-1.5 size-4" />
                Add Your First Word
              </Button>
            </div>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AddVocabularyDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onItemAdded={handleItemAdded}
      />

      {/* Stats Bar Header */}
      <VocabularyStatsBar
        totalCount={stats.total}
        dueCount={stats.due}
        masteredCount={stats.mastered}
        learningCount={stats.learning}
        activeFilter={statusFilter}
        onSelectFilter={setStatusFilter}
        onOpenAddDialog={() => setIsAddOpen(true)}
      />

      {/* Filter and Search Bar */}
      <VocabularyFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sort={sort}
        onSortChange={setSort}
        totalFiltered={filteredItems.length}
      />

      {/* Vocabulary Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center bg-card/40">
          <Sparkles className="size-8 text-muted-foreground/60 mb-2" />
          <h3 className="text-sm font-semibold">No matching vocabulary</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            No vocabulary found matching &ldquo;{searchQuery || statusFilter}
            &rdquo;. Try adjusting your search query or filters.
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
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filteredItems.map((item) => (
            <VocabularyCard
              key={item.id}
              item={item}
              isPending={pendingIds.has(item.id)}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
