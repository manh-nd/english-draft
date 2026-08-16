"use client";

import { Search, X, Star, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type ErrorTypeFilter = "all" | "grammar" | "style" | "vocabulary";

interface CorrectionFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  errorTypeFilter: ErrorTypeFilter;
  onErrorTypeFilterChange: (type: ErrorTypeFilter) => void;
  starredOnly: boolean;
  onStarredOnlyToggle: () => void;
  dateSortAsc: boolean;
  onDateSortToggle: () => void;
  totalFiltered: number;
}

const FILTER_TYPES: Array<{ value: ErrorTypeFilter; label: string }> = [
  { value: "all", label: "All Types" },
  { value: "grammar", label: "Grammar" },
  { value: "style", label: "Style" },
  { value: "vocabulary", label: "Vocabulary" },
];

export function CorrectionFilters({
  searchQuery,
  onSearchChange,
  errorTypeFilter,
  onErrorTypeFilterChange,
  starredOnly,
  onStarredOnlyToggle,
  dateSortAsc,
  onDateSortToggle,
  totalFiltered,
}: CorrectionFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search original text, corrections, context, or document..."
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

      {/* Filter controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Error type filter group */}
        <div className="flex items-center rounded-lg border bg-muted/60 p-0.5 text-xs font-medium">
          {FILTER_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onErrorTypeFilterChange(value)}
              className={`rounded-md px-2.5 py-1 transition-all ${
                errorTypeFilter === value
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Starred only toggle */}
        <Button
          type="button"
          variant={starredOnly ? "default" : "outline"}
          size="sm"
          onClick={onStarredOnlyToggle}
          className={`h-8 gap-1.5 text-xs font-medium ${
            starredOnly
              ? "bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label={
            starredOnly ? "Showing starred only" : "Filter by starred"
          }
        >
          <Star
            className={`size-3.5 ${starredOnly ? "fill-white text-white" : ""}`}
          />
          Starred
        </Button>

        {/* Date sort toggle */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDateSortToggle}
          className="h-8 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          aria-label={dateSortAsc ? "Sort: Oldest first" : "Sort: Newest first"}
        >
          <ArrowUpDown className="size-3.5" />
          {dateSortAsc ? "Oldest" : "Newest"}
        </Button>

        {/* Count indicator */}
        <span className="hidden text-xs text-muted-foreground lg:inline-block">
          {totalFiltered} items
        </span>
      </div>
    </div>
  );
}
