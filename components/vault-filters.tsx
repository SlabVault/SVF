"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { SlabItem } from "@/types/content";

type Props = {
  slabs: SlabItem[];
  onFilteredSlabsChange: (slabs: SlabItem[]) => void;
};

export function VaultFilters({ slabs, onFilteredSlabsChange }: Props) {
  const [sortBy, setSortBy] = useState<"date" | "value" | "name">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");

  const filterAndSortSlabs = () => {
    let filtered = [...slabs];
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (slab) =>
          slab.name.toLowerCase().includes(query) ||
          slab.grade.toLowerCase().includes(query)
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === "date") {
        comparison = a.acquiredAt.localeCompare(b.acquiredAt);
      } else if (sortBy === "value") {
        const aValue = a.estimatedValueUsd ?? 0;
        const bValue = b.estimatedValueUsd ?? 0;
        comparison = aValue - bValue;
      } else if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return filtered;
  };

  const handleSortChange = (newSortBy: "date" | "value" | "name") => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("desc");
    }
  };

  useEffect(() => {
    const filteredSlabs = filterAndSortSlabs();
    onFilteredSlabsChange(filteredSlabs);
  }, [slabs, sortBy, sortOrder, searchQuery, onFilteredSlabsChange]);

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
      </div>
      <input
        type="text"
        placeholder="Search slabs..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full rounded-md border border-line bg-vault-panel px-3 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-64"
      />
    </div>
  );
}
