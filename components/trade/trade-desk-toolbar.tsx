"use client";

import { Button } from "@/components/ui/button";
import type { TradeGridDensity } from "@/lib/layout";
import type { TradeListingSort } from "@/lib/trade-listings";
import { cn } from "@/lib/utils";

type Props = {
  sort: TradeListingSort;
  onSortChange: (sort: TradeListingSort) => void;
  resultCount: number;
  totalCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  gridDensity: TradeGridDensity;
  onDensityChange: (density: TradeGridDensity) => void;
  onRefresh?: () => void;
  /** Aggregate `/trade/all` desk — exposes Venue sort in the dropdown. */
  aggregateDesk?: boolean;
  className?: string;
};

const BASE_SORT_OPTIONS: { value: TradeListingSort; label: string }[] = [
  { value: "price_asc", label: "Price (low to high)" },
  { value: "price_desc", label: "Price (high to low)" },
  { value: "rarity", label: "Rarity" },
  { value: "last_sale", label: "Last sale" },
  { value: "recent", label: "Recently listed" },
];

const AGGREGATE_SORT_OPTIONS: { value: TradeListingSort; label: string }[] = [
  { value: "price_asc", label: "Price (low to high)" },
  { value: "price_desc", label: "Price (high to low)" },
  { value: "venue_asc", label: "Venue" },
  { value: "rarity", label: "Rarity" },
  { value: "last_sale", label: "Last sale" },
  { value: "recent", label: "Recently listed" },
];

const DENSITY_OPTIONS: { value: TradeGridDensity; label: string; title: string }[] = [
  { value: "s", label: "s", title: "Small tiles" },
  { value: "m", label: "m", title: "Medium tiles" },
  { value: "l", label: "l", title: "Large tiles" },
];

export function TradeDeskToolbar({
  sort,
  onSortChange,
  resultCount,
  totalCount,
  searchQuery,
  onSearchChange,
  gridDensity,
  onDensityChange,
  onRefresh,
  aggregateDesk = false,
  className,
}: Props) {
  const sortOptions = aggregateDesk ? AGGREGATE_SORT_OPTIONS : BASE_SORT_OPTIONS;

  return (
    <div
      className={cn(
        "mb-3 flex flex-wrap items-center justify-between gap-2",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="trade-grid-search">
          Search listings
        </label>
        <input
          id="trade-grid-search"
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search NFTs by name or grade…"
          className="h-7 min-w-[10rem] flex-1 rounded border border-[#333] bg-[var(--trade-surface)] px-2 text-xs text-[var(--tensor-white)] placeholder:text-[var(--trade-muted)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--tensor-accent)] sm:max-w-xs"
        />
        <p className="hidden font-mono text-[11px] text-[var(--trade-muted)] sm:block">
          {resultCount} / {totalCount}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div
          className="flex rounded border border-[#333] bg-[var(--trade-surface)]"
          role="group"
          aria-label="Grid density"
        >
          {DENSITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              title={option.title}
              aria-pressed={gridDensity === option.value}
              onClick={() => onDensityChange(option.value)}
              className={cn(
                "h-7 min-w-[3.25rem] px-2 text-[10px] font-medium tracking-wide transition-colors",
                gridDensity === option.value
                  ? "bg-[var(--tensor-accent)] text-[var(--tensor-white)]"
                  : "text-[var(--trade-muted)] hover:text-[var(--tensor-white)]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {onRefresh ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={onRefresh}
            aria-label="Refresh listings"
          >
            Refresh
          </Button>
        ) : null}

        <label className="sr-only" htmlFor="trade-listing-sort">
          Sort listings
        </label>
        <select
          id="trade-listing-sort"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as TradeListingSort)}
          className="h-7 rounded border border-[#333] bg-[var(--trade-surface)] px-2 text-xs text-[var(--tensor-white)]"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
