"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { SlabItem } from "@/types/content";

export type VaultSortBy = "date" | "value" | "name";
export type VaultSortOrder = "asc" | "desc";

type Props = {
  slabs: SlabItem[];
  sortBy: VaultSortBy;
  sortOrder: VaultSortOrder;
  searchQuery: string;
  onSortByChange: (sortBy: VaultSortBy) => void;
  onSortOrderChange: (sortOrder: VaultSortOrder) => void;
  onSearchQueryChange: (query: string) => void;
};

export function filterAndSortSlabs(
  slabs: SlabItem[],
  sortBy: VaultSortBy,
  sortOrder: VaultSortOrder,
  searchQuery: string,
): SlabItem[] {
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
      comparison = a.acquiredAt.localeCompare(b.acquiredAt);
    } else if (sortBy === "value") {
      const aValue = a.estimatedValueUsd ?? 0;
      const bValue = b.estimatedValueUsd ?? 0;
      comparison = aValue - bValue;
    } else {
      comparison = a.name.localeCompare(b.name);
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return filtered;
}

export function VaultFilters({
  slabs,
  sortBy,
  sortOrder,
  searchQuery,
  onSortByChange,
  onSortOrderChange,
  onSearchQueryChange,
}: Props) {
  const resultCount = useMemo(
    () => filterAndSortSlabs(slabs, sortBy, sortOrder, searchQuery).length,
    [slabs, sortBy, sortOrder, searchQuery],
  );

  const handleSortChange = (newSortBy: VaultSortBy) => {
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
          variant={sortBy === "value" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => handleSortChange("value")}
          className="text-xs"
        >
          Value {sortBy === "value" && (sortOrder === "asc" ? "↑" : "↓")}
        </Button>
        <Button
          variant={sortBy === "name" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => handleSortChange("name")}
          className="text-xs"
        >
          Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
        </Button>
        <span className="text-xs text-muted">
          {resultCount} slab{resultCount === 1 ? "" : "s"}
        </span>
      </div>
      <input
        type="search"
        placeholder="Search slabs..."
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        className="w-full rounded-md border border-line bg-vault-panel px-3 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-64"
      />
    </div>
  );
}
