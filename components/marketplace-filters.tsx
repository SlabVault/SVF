"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { MarketplaceSlab } from "@/lib/marketplace-slabs";

export type MarketplaceSortBy = "date" | "price" | "name";
export type MarketplaceSortOrder = "asc" | "desc";

type Props = {
  slabs: MarketplaceSlab[];
  sortBy: MarketplaceSortBy;
  sortOrder: MarketplaceSortOrder;
  searchQuery: string;
  onSortByChange: (sortBy: MarketplaceSortBy) => void;
  onSortOrderChange: (sortOrder: MarketplaceSortOrder) => void;
  onSearchQueryChange: (query: string) => void;
};

function acquiredAtMs(value: string | Date): number {
  const date = value instanceof Date ? value : new Date(value);
  const ms = date.getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

export function filterAndSortMarketplaceSlabs(
  slabs: MarketplaceSlab[],
  sortBy: MarketplaceSortBy,
  sortOrder: MarketplaceSortOrder,
  searchQuery: string,
): MarketplaceSlab[] {
  let filtered = [...slabs];

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (slab) =>
        slab.name.toLowerCase().includes(query) ||
        slab.grade.toLowerCase().includes(query),
    );
  }

  filtered.sort((a, b) => {
    let comparison = 0;

    if (sortBy === "date") {
      comparison = acquiredAtMs(a.acquiredAt) - acquiredAtMs(b.acquiredAt);
    } else if (sortBy === "price") {
      comparison = a.solPrice - b.solPrice;
    } else {
      comparison = a.name.localeCompare(b.name);
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return filtered;
}

export function MarketplaceFilters({
  slabs,
  sortBy,
  sortOrder,
  searchQuery,
  onSortByChange,
  onSortOrderChange,
  onSearchQueryChange,
}: Props) {
  const resultCount = useMemo(
    () => filterAndSortMarketplaceSlabs(slabs, sortBy, sortOrder, searchQuery).length,
    [slabs, sortBy, sortOrder, searchQuery],
  );

  const handleSortChange = (newSortBy: MarketplaceSortBy) => {
    if (sortBy === newSortBy) {
      onSortOrderChange(sortOrder === "asc" ? "desc" : "asc");
    } else {
      onSortByChange(newSortBy);
      onSortOrderChange("desc");
    }
  };

  return (
    <div className="sticky top-0 z-10 -mx-4 space-y-4 border-b border-line bg-background/95 px-4 py-4 backdrop-blur-sm sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
      <input
        type="search"
        placeholder="Search listings..."
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        aria-label="Search marketplace listings"
        className="w-full rounded-md border border-line bg-vault-panel px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:hidden"
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <span className="shrink-0 text-sm text-muted">Sort:</span>
        <Button
          variant={sortBy === "date" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => handleSortChange("date")}
          className="shrink-0 text-xs"
        >
          Date {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}
        </Button>
        <Button
          variant={sortBy === "price" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => handleSortChange("price")}
          className="shrink-0 text-xs"
        >
          Price {sortBy === "price" && (sortOrder === "asc" ? "↑" : "↓")}
        </Button>
        <Button
          variant={sortBy === "name" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => handleSortChange("name")}
          className="shrink-0 text-xs"
        >
          Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
        </Button>
        <span className="shrink-0 text-xs text-muted">
          {resultCount} listing{resultCount === 1 ? "" : "s"}
        </span>
      </div>
      <input
        type="search"
        placeholder="Search listings..."
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        aria-label="Search marketplace listings"
        className="hidden w-full rounded-md border border-line bg-vault-panel px-3 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:block sm:w-64"
      />
      </div>
    </div>
  );
}
