"use client";

import { useRef } from "react";

import { cn } from "@/lib/utils";

export type TradeLandingIndexView = "cards" | "table";
export type TradeLandingTimeframe = "1h" | "24h" | "7d";

const VIEW_OPTIONS: { id: TradeLandingIndexView; label: string }[] = [
  { id: "cards", label: "Cards" },
  { id: "table", label: "Table" },
];

const TIMEFRAME_OPTIONS: { id: TradeLandingTimeframe; label: string }[] = [
  { id: "1h", label: "1h" },
  { id: "24h", label: "24h" },
  { id: "7d", label: "7d" },
];

const TABLE_SOON_ACTIONS = [
  { id: "favorites", label: "FAVORITES", ariaLabel: "Favorites — coming soon" },
  { id: "inventory", label: "INVENTORY", ariaLabel: "Inventory — coming soon" },
] as const;

type Props = {
  view: TradeLandingIndexView;
  onViewChange: (view: TradeLandingIndexView) => void;
  timeframe: TradeLandingTimeframe;
  onTimeframeChange: (timeframe: TradeLandingTimeframe) => void;
  trendingActive?: boolean;
  onTrendingChange?: (active: boolean) => void;
  newMintsActive?: boolean;
  onNewMintsChange?: (active: boolean) => void;
  collectionFilter?: string;
  onCollectionFilterChange?: (value: string) => void;
  onRefreshCollections?: () => void;
  className?: string;
};

/** Tensor homepage index controls — view toggle + trending/timeframe chips. */
export function TradeLandingIndexToolbar({
  view,
  onViewChange,
  timeframe,
  onTimeframeChange,
  trendingActive = true,
  onTrendingChange,
  newMintsActive = false,
  onNewMintsChange,
  collectionFilter = "",
  onCollectionFilterChange,
  onRefreshCollections,
  className,
}: Props) {
  const collectionFilterRef = useRef<HTMLInputElement>(null);
  const timeframeMode = !trendingActive && !newMintsActive;

  const focusCollectionFilter = () => {
    const input = collectionFilterRef.current;
    if (!input) return;
    input.scrollIntoView({ behavior: "smooth", block: "nearest" });
    input.focus({ preventScroll: true });
  };

  return (
    <div className={cn("space-y-2 border-b border-[#333] pb-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={cn(
            "rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors",
            trendingActive
              ? "bg-[var(--tensor-accent)] text-white"
              : "text-[var(--trade-muted)] hover:text-[var(--tensor-white)]",
          )}
          onClick={() => {
            onNewMintsChange?.(false);
            onTrendingChange?.(true);
          }}
          aria-pressed={trendingActive}
        >
          TRENDING
        </button>
        <button
          type="button"
          className={cn(
            "rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors",
            newMintsActive
              ? "bg-[var(--tensor-accent)] text-white"
              : "text-[var(--trade-muted)] hover:text-[var(--tensor-white)]",
          )}
          onClick={() => {
            onTrendingChange?.(false);
            onNewMintsChange?.(true);
          }}
          aria-pressed={newMintsActive}
        >
          NEW MINTS
        </button>
        <div
          className="flex rounded border border-[#333] bg-[var(--trade-surface)]"
          role="group"
          aria-label="Timeframe"
        >
          {TIMEFRAME_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={cn(
                "px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors",
                timeframe === opt.id
                  ? "bg-[var(--trade-panel)] text-[var(--tensor-white)]"
                  : "text-[var(--trade-muted)] hover:text-[var(--tensor-white)]",
              )}
              onClick={() => {
                onTrendingChange?.(false);
                onNewMintsChange?.(false);
                onTimeframeChange(opt.id);
              }}
              aria-pressed={timeframeMode && timeframe === opt.id}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="flex rounded border border-[#333] bg-[var(--trade-surface)]"
        role="group"
        aria-label="Index view"
      >
        {VIEW_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={cn(
              "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors",
              view === opt.id
                ? "bg-[var(--tensor-accent)] text-white"
                : "text-[var(--trade-muted)] hover:text-[var(--tensor-white)]",
            )}
            onClick={() => onViewChange(opt.id)}
            aria-pressed={view === opt.id}
          >
            {opt.label}
          </button>
        ))}
      </div>
      </div>

      {view === "table" ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="sr-only" htmlFor="trade-landing-collection-filter">
            Filter by collection
          </label>
          <input
            ref={collectionFilterRef}
            id="trade-landing-collection-filter"
            type="search"
            value={collectionFilter}
            onChange={(event) => onCollectionFilterChange?.(event.target.value)}
            placeholder="Filter by collection"
            className="h-7 min-w-[10rem] flex-1 rounded border border-[#333] bg-[var(--trade-surface)] px-2 text-xs text-[var(--tensor-white)] placeholder:text-[var(--trade-muted)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--tensor-accent)] sm:max-w-xs"
          />
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Collection index actions"
          >
            <button
              type="button"
              aria-label="Filter by collection"
              title="Filter by collection"
              onClick={focusCollectionFilter}
              className="rounded border border-[#333] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--tensor-white)] transition-colors hover:border-[var(--tensor-accent)] hover:text-[var(--tensor-accent)]"
            >
              FILTERS
            </button>
            {onRefreshCollections ? (
              <button
                type="button"
                aria-label="Refresh collections"
                title="Refresh collections"
                onClick={onRefreshCollections}
                className="rounded border border-[#333] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--tensor-white)] transition-colors hover:border-[var(--tensor-accent)] hover:text-[var(--tensor-accent)]"
              >
                Refresh
              </button>
            ) : null}
            {TABLE_SOON_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled
                aria-label={action.ariaLabel}
                title={action.ariaLabel}
                className="rounded border border-[#333] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)] opacity-60"
              >
                {action.label}
                <span className="ml-1 text-[9px] font-normal normal-case">Soon</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
