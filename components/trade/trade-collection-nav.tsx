"use client";

import Link from "next/link";
import { useMemo } from "react";

import { VenueBadge } from "@/components/trade/venue-badge";
import type { TradeLandingCollectionPreview } from "@/lib/trade-landing";
import { getTradeLandingAggregateFromCollections } from "@/lib/trade-landing-aggregate";
import { ALL_LISTINGS_SLUG, TRADE_ROUTES } from "@/lib/trade-routes";
import { cn } from "@/lib/utils";

type Props = {
  collections: TradeLandingCollectionPreview[];
  activeSlug?: string;
  variant?: "sidebar" | "horizontal";
  className?: string;
  /** Merged all-listings count — overrides preview sum on aggregate desk. */
  aggregateListedCount?: number;
  /** Merged all-listings floor — overrides preview min on aggregate desk. */
  aggregateFloorSol?: number | null;
};

function formatAggregateFloor(floorSol: number | null): string | null {
  if (floorSol == null || !Number.isFinite(floorSol) || floorSol <= 0) {
    return null;
  }
  return String(floorSol);
}

export function TradeCollectionNav({
  collections,
  activeSlug,
  variant = "sidebar",
  className,
  aggregateListedCount,
  aggregateFloorSol,
}: Props) {
  const isHorizontal = variant === "horizontal";
  const previewAggregate = useMemo(
    () => getTradeLandingAggregateFromCollections(collections),
    [collections],
  );
  const allActive = activeSlug === ALL_LISTINGS_SLUG;
  const listedCount = aggregateListedCount ?? previewAggregate.listedCount;
  const floorSol =
    aggregateFloorSol !== undefined
      ? aggregateFloorSol
      : previewAggregate.floorSol;
  const aggregateFloor = formatAggregateFloor(floorSol);

  return (
    <nav
      className={cn(
        isHorizontal
          ? "trade-collection-strip flex gap-2 overflow-x-auto overscroll-x-contain border-b border-[#333] px-3 py-2 [scrollbar-width:thin] snap-x snap-mandatory"
          : "trade-collection-nav flex flex-col gap-0 p-1",
        className,
      )}
      aria-label="Collections"
    >
      {!isHorizontal ? (
        <p className="px-1.5 pb-0.5 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--trade-muted)]">
          Collections
        </p>
      ) : null}

      <ul
        className={cn(
          isHorizontal ? "flex min-w-max gap-2" : "flex flex-col gap-0",
        )}
      >
        <li>
          <Link
            href={TRADE_ROUTES.all}
            aria-current={allActive ? "page" : undefined}
            className={cn(
              "group flex items-center gap-1 rounded-md border transition-colors",
              isHorizontal
                ? "min-h-11 shrink-0 snap-start px-2.5 py-1.5 text-xs"
                : "min-h-7 px-1 py-px text-[10px] leading-tight",
              allActive
                ? "border-[var(--tensor-accent)]/50 bg-[var(--trade-panel)] text-[var(--tensor-white)]"
                : "border-transparent text-[var(--trade-muted)] hover:border-[#333] hover:bg-[var(--trade-surface)] hover:text-[var(--tensor-white)]",
            )}
            data-growth-event="trade_collection_nav"
            data-growth-context="trade_nav:all"
          >
            <span
              className={cn(
                "trade-collection-nav__thumb flex shrink-0 items-center justify-center rounded border border-[#333] bg-[var(--trade-panel)] font-bold uppercase text-[var(--trade-muted)]",
                isHorizontal ? "size-4 text-[7px]" : "size-5 text-[8px]",
              )}
              aria-hidden
            >
              ALL
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">All listings</span>
            {listedCount > 0 || aggregateFloor != null ? (
              <span className="trade-collection-nav__floor shrink-0 whitespace-nowrap font-mono text-[10px] tabular-nums tracking-tight text-[var(--tensor-white)]">
                {listedCount > 0 ? (
                  <span className="text-[var(--trade-muted)]">{listedCount}</span>
                ) : null}
                {listedCount > 0 && aggregateFloor != null ? (
                  <span className="mx-0.5 text-[var(--trade-muted)]">·</span>
                ) : null}
                {aggregateFloor != null ? `${aggregateFloor} ◎` : null}
              </span>
            ) : null}
            {!isHorizontal ? (
              <span className="trade-venue-badge scale-[0.8] rounded border border-[#555] bg-[var(--tensor-black)]/90 px-1 py-0 text-[9px] font-semibold uppercase tracking-wide text-[var(--tensor-white)]">
                ALL
              </span>
            ) : null}
          </Link>
        </li>

        {collections.map((collection) => {
          const active = collection.slug === activeSlug;

          return (
            <li key={collection.slug}>
              <Link
                href={collection.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-1 rounded-md border transition-colors",
                  isHorizontal
                    ? "min-h-11 shrink-0 snap-start px-2.5 py-1.5 text-xs"
                    : "min-h-7 px-1 py-px text-[10px] leading-tight",
                  active
                    ? "border-[var(--tensor-accent)]/50 bg-[var(--trade-panel)] text-[var(--tensor-white)]"
                    : "border-transparent text-[var(--trade-muted)] hover:border-[#333] hover:bg-[var(--trade-surface)] hover:text-[var(--tensor-white)]",
                )}
                data-growth-event="trade_collection_nav"
                data-growth-context={`trade_nav:${collection.slug}`}
              >
                <span
                  className={cn(
                    "trade-collection-nav__thumb flex shrink-0 items-center justify-center rounded border border-[#333] bg-[var(--trade-panel)] font-bold uppercase text-[var(--trade-muted)]",
                    isHorizontal ? "size-4 text-[7px]" : "size-5 text-[8px]",
                  )}
                  aria-hidden
                >
                  {collection.name.slice(0, 2)}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {collection.name}
                </span>
                {collection.floorSol != null ? (
                  <span className="trade-collection-nav__floor shrink-0 whitespace-nowrap font-mono text-[10px] tabular-nums tracking-tight text-[var(--tensor-white)]">
                    {collection.floorSol} ◎
                  </span>
                ) : null}
                {!isHorizontal ? (
                  <VenueBadge partner={collection.partner} className="scale-[0.8] px-1 py-0" />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
