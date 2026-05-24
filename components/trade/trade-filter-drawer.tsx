"use client";

import { useEffect, useId, useState, type Dispatch, type SetStateAction } from "react";

import { TradeTraitFilters } from "@/components/trade/trade-trait-filters";
import { Button } from "@/components/ui/button";
import type { TradeListing, TradeTraitFilters as TradeFilters } from "@/lib/trade-listings";

type Props = {
  listings: TradeListing[];
  availableGrades: string[];
  filters: TradeFilters;
  onFiltersChange: Dispatch<SetStateAction<TradeFilters>>;
  resultCount: number;
  aggregateDesk?: boolean;
};

function countActiveFilters(filters: TradeFilters): number {
  let count = 0;
  if (filters.searchQuery.trim()) count += 1;
  if (filters.setQuery.trim()) count += 1;
  if (filters.minAskSol != null || filters.maxAskSol != null) count += 1;
  count += filters.grades.length;
  count += filters.graders.length;
  count += filters.partners.length;
  return count;
}

/** Mobile filter drawer — replaces left filter rail below `md`. */
export function TradeFilterDrawer({
  listings,
  availableGrades,
  filters,
  onFiltersChange,
  resultCount,
  aggregateDesk = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const activeCount = countActiveFilters(filters);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarCompensation =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarCompensation > 0) {
      document.body.style.paddingRight = `${scrollbarCompensation}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11 shrink-0 border-[#333] bg-[var(--trade-surface)] text-[11px] font-semibold uppercase tracking-wide text-[var(--tensor-white)] md:hidden"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
        data-growth-event="trade_filter_drawer_open"
      >
        Filters
        {activeCount > 0 ? (
          <span className="ml-1.5 rounded-full bg-[var(--trade-panel)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--tensor-accent)]">
            {activeCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-[55] md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Listing filters"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
          />
          <div
            id={panelId}
            className="absolute left-0 top-0 flex h-full w-[min(100%,20rem)] flex-col border-r border-[#333] bg-[var(--tensor-black)] shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#333] px-4 py-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--tensor-white)]">
                  Filters
                </p>
                <p className="font-mono text-[10px] text-[var(--trade-muted)]">
                  {resultCount} result{resultCount === 1 ? "" : "s"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 shrink-0"
                onClick={() => setOpen(false)}
                aria-label="Close filters"
              >
                ✕
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
              <TradeTraitFilters
                listings={listings}
                availableGrades={availableGrades}
                filters={filters}
                onFiltersChange={onFiltersChange}
                resultCount={resultCount}
                aggregateDesk={aggregateDesk}
                compact
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
