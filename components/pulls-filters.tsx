"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { PullItem } from "@/types/content";

export type PullSortBy = "date" | "cost" | "roi";
export type PullSortOrder = "asc" | "desc";

type Props = {
  pulls: PullItem[];
  sortBy: PullSortBy;
  sortOrder: PullSortOrder;
  searchQuery: string;
  onSortByChange: (sortBy: PullSortBy) => void;
  onSortOrderChange: (sortOrder: PullSortOrder) => void;
  onSearchQueryChange: (query: string) => void;
};

export function filterAndSortPulls(
  pulls: PullItem[],
  sortBy: PullSortBy,
  sortOrder: PullSortOrder,
  searchQuery: string,
): PullItem[] {
  let filtered = [...pulls];

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (pull) =>
        pull.summary.toLowerCase().includes(query) ||
        pull.source.toLowerCase().includes(query),
    );
  }

  filtered.sort((a, b) => {
    let comparison = 0;

    if (sortBy === "date") {
      comparison = a.date.localeCompare(b.date);
    } else if (sortBy === "cost") {
      const aCost = a.costUsd ?? 0;
      const bCost = b.costUsd ?? 0;
      comparison = aCost - bCost;
    } else {
      const aRoi = a.outcomeUsd && a.costUsd ? a.outcomeUsd - a.costUsd : 0;
      const bRoi = b.outcomeUsd && b.costUsd ? b.outcomeUsd - b.costUsd : 0;
      comparison = aRoi - bRoi;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return filtered;
}

export function PullsFilters({
  pulls,
  sortBy,
  sortOrder,
  searchQuery,
  onSortByChange,
  onSortOrderChange,
  onSearchQueryChange,
}: Props) {
  const resultCount = useMemo(
    () => filterAndSortPulls(pulls, sortBy, sortOrder, searchQuery).length,
    [pulls, sortBy, sortOrder, searchQuery],
  );

  const handleSortChange = (newSortBy: PullSortBy) => {
    if (sortBy === newSortBy) {
      onSortOrderChange(sortOrder === "asc" ? "desc" : "asc");
    } else {
      onSortByChange(newSortBy);
      onSortOrderChange("desc");
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Sort by:</span>
        <Button
          variant={sortBy === "date" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => handleSortChange("date")}
          className="text-xs"
        >
          Date {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}
        </Button>
        <Button
          variant={sortBy === "cost" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => handleSortChange("cost")}
          className="text-xs"
        >
          Cost {sortBy === "cost" && (sortOrder === "asc" ? "↑" : "↓")}
        </Button>
        <Button
          variant={sortBy === "roi" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => handleSortChange("roi")}
          className="text-xs"
        >
          ROI {sortBy === "roi" && (sortOrder === "asc" ? "↑" : "↓")}
        </Button>
        <span className="text-xs text-muted">
          {resultCount} pull{resultCount === 1 ? "" : "s"}
        </span>
      </div>
      <input
        type="search"
        placeholder="Search pulls..."
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        className="w-full rounded-md border border-line bg-vault-panel px-3 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-64"
      />
    </div>
  );
}
