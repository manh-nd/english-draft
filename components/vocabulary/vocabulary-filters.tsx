"use client";

import { Search, X, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type VocabularyStatusFilter = "all" | "due" | "learning" | "mastered";
export type VocabularySort = "newest" | "alpha" | "due";

interface VocabularyFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: VocabularyStatusFilter;
  onStatusFilterChange: (filter: VocabularyStatusFilter) => void;
  sort: VocabularySort;
  onSortChange: (sort: VocabularySort) => void;
  totalFiltered: number;
}

const STATUS_FILTERS: Array<{ value: VocabularyStatusFilter; label: string }> =
  [
    { value: "all", label: "All Words" },
    { value: "due", label: "Due Today" },
    { value: "learning", label: "Learning" },
    { value: "mastered", label: "Mastered" },
  ];

export function VocabularyFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sort,
  onSortChange,
  totalFiltered,
}: VocabularyFiltersProps) {
  const toggleSort = () => {
    if (sort === "newest") onSortChange("alpha");
    else if (sort === "alpha") onSortChange("due");
    else onSortChange("newest");
  };

  const getSortLabel = () => {
    if (sort === "newest") return "Sort: Newest";
    if (sort === "alpha") return "Sort: A-Z";
    return "Sort: SRS Due";
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search words, definitions, translations, or documents..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-9 pr-8 text-xs sm:text-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Filter and Sort Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status segmented tabs */}
        <div className="flex items-center rounded-lg border bg-muted/60 p-0.5 text-xs font-medium">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onStatusFilterChange(value)}
              className={`rounded-md px-2.5 py-1 transition-all ${
                statusFilter === value
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sort Toggle Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleSort}
          className="h-8 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          aria-label={getSortLabel()}
        >
          <ArrowUpDown className="size-3.5" />
          <span>
            {sort === "newest"
              ? "Newest"
              : sort === "alpha"
                ? "A-Z"
                : "SRS Due"}
          </span>
        </Button>

        {/* Count indicator */}
        <span className="hidden text-xs text-muted-foreground lg:inline-block">
          {totalFiltered} items
        </span>
      </div>
    </div>
  );
}
