"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { PullItem } from "@/types/content";

type Props = {
  pulls: PullItem[];
  onFilteredPullsChange: (pulls: PullItem[]) => void;
};

export function PullsFilters({ pulls, onFilteredPullsChange }: Props) {
  const [sortBy, setSortBy] = useState<"date" | "cost" | "roi">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");

  const filterAndSortPulls = () => {
    let filtered = [...pulls];
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (pull) =>
          pull.summary.toLowerCase().includes(query) ||
          pull.source.toLowerCase().includes(query)
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === "date") {
        comparison = a.date.localeCompare(b.date);
      } else if (sortBy === "cost") {
        const aCost = a.costUsd ?? 0;
        const bCost = b.costUsd ?? 0;
        comparison = aCost - bCost;
      } else if (sortBy === "roi") {
        const aRoi = a.outcomeUsd && a.costUsd ? a.outcomeUsd - a.costUsd : 0;
        const bRoi = b.outcomeUsd && b.costUsd ? b.outcomeUsd - b.costUsd : 0;
        comparison = aRoi - bRoi;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return filtered;
  };

  const handleSortChange = (newSortBy: "date" | "cost" | "roi") => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("desc");
    }
  };

  useEffect(() => {
    const filteredPulls = filterAndSortPulls();
    onFilteredPullsChange(filteredPulls);
  }, [pulls, sortBy, sortOrder, searchQuery, onFilteredPullsChange]);

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
      </div>
      <input
        type="text"
        placeholder="Search pulls..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full rounded-md border border-line bg-vault-panel px-3 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-64"
      />
    </div>
  );
}
