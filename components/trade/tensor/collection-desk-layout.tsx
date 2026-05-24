"use client";

import Link from "next/link";
import { Suspense, useMemo, useState, type ReactNode } from "react";

import { ArchivedRouteNotice } from "@/components/archived-route-notice";
import { VenueBadge } from "@/components/trade/venue-badge";
import { TradeCollectionNav } from "@/components/trade/trade-collection-nav";
import { TradeDeskHeader } from "@/components/trade/trade-desk-header";
import type { TradeDeskCollectionContext } from "@/components/trade/trade-desk-header";
import type { TradePartnerId } from "@/lib/onchain/collections";
import type { TradeLandingCollectionPreview } from "@/lib/trade-landing";
import { formatPriceChange24h } from "@/lib/trade/tensor-ribbon-metrics";
import { cn } from "@/lib/utils";

import { TensorUiLayout } from "./ui-layout";

type TensorCollectionDeskLayoutProps = {
  collections: TradeLandingCollectionPreview[];
  activeSlug?: string;
  activeCollection?: TradeDeskCollectionContext;
  /** Merged all-listings nav stats — used on `/trade/all` aggregate desk. */
  aggregateListedCount?: number;
  aggregateFloorSol?: number | null;
  sidebar?: ReactNode;
  /** Tensor Pro BUY/SELL/SWEEP column — left of filter rail. */
  tradePanel?: ReactNode;
  activity?: ReactNode;
  children: ReactNode;
  className?: string;
};

export type { TensorCollectionDeskLayoutProps };

/**
 * Three-column Tensor desk layout — nav | main (+ optional filters) | activity.
 * Ported from vendor template page structure + SlabVault desk shell.
 */
export function TensorCollectionDeskLayout({
  collections,
  activeSlug,
  activeCollection,
  aggregateListedCount,
  aggregateFloorSol,
  sidebar,
  tradePanel,
  activity,
  children,
  className,
}: TensorCollectionDeskLayoutProps) {
  return (
    <TensorUiLayout>
      <div
        className={cn(
          "trade-desk-shell mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-hidden",
          className,
        )}
      >
        <TradeDeskHeader activeSlug={activeSlug} activeCollection={activeCollection} />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <TradeCollectionNav
            collections={collections}
            activeSlug={activeSlug}
            aggregateListedCount={aggregateListedCount}
            aggregateFloorSol={aggregateFloorSol}
            className="lg:hidden"
            variant="horizontal"
          />

          <aside className="hidden w-[13.5rem] shrink-0 border-r border-[#333] bg-[var(--trade-surface)] lg:block">
            <TradeCollectionNav
              collections={collections}
              activeSlug={activeSlug}
              aggregateListedCount={aggregateListedCount}
              aggregateFloorSol={aggregateFloorSol}
              variant="sidebar"
            />
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden xl:flex-row">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {sidebar || tradePanel ? (
                <div className="trade-desk-pro-row flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
                  {tradePanel ? (
                    <div className="trade-desk-pro-panel hidden min-h-0 w-[12.5rem] shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-[#333] bg-[var(--trade-surface)] xl:flex">
                      {tradePanel}
                    </div>
                  ) : null}
                  {sidebar ? (
                    <div className="trade-desk-pro-filters hidden min-h-0 w-[14rem] shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-[#333] md:flex">
                      {sidebar}
                    </div>
                  ) : null}
                  <div className="trade-desk-pro-main min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4">
                    {children}
                  </div>
                </div>
              ) : (
                <div className="trade-desk-pro-main min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4">
                  <Suspense fallback={null}>
                    <ArchivedRouteNotice />
                  </Suspense>
                  {children}
                </div>
              )}
            </div>

            {activity ? (
              <aside className="trade-desk-pro-activity flex w-full min-h-0 shrink-0 flex-col overflow-hidden border-t border-[#333] bg-[var(--trade-surface)] xl:w-[17.5rem] xl:border-l xl:border-t-0">
                {activity}
              </aside>
            ) : null}
          </div>
        </div>
      </div>
    </TensorUiLayout>
  );
}

export type TensorIndexSortKey =
  | "floor"
  | "sellNow"
  | "listed"
  | "listedPct"
  | "marketCap"
  | "volume24h"
  | "priceChange24h";
export type TensorIndexSortDir = "asc" | "desc";

export type TensorCollectionIndexRow = {
  slug: string;
  name: string;
  href: string;
  imageUrl?: string | null;
  floorSol: string | null;
  /** Best ask when listed > 0 — mirrors Tensor sell-now column. */
  sellNowSol: string | null;
  listedCount: number | null;
  listedPct: number | null;
  volume24hSol: string | null;
  marketCapSol: string | null;
  priceChange24hPct: number | null;
  status: string;
  partner: TradePartnerId;
};

type IndexTableProps = {
  rows: TensorCollectionIndexRow[];
  className?: string;
  /** Controlled sort — parent can sync with timeframe toolbar. */
  sortKey?: TensorIndexSortKey;
  sortDir?: TensorIndexSortDir;
  onSortChange?: (key: TensorIndexSortKey, dir: TensorIndexSortDir) => void;
};

function parseFloorSol(floorSol: string | null): number | null {
  if (floorSol == null) return null;
  const n = Number.parseFloat(floorSol);
  return Number.isFinite(n) ? n : null;
}

function parseVolume24hSol(volume24hSol: string | null): number | null {
  if (volume24hSol == null) return null;
  const n = Number.parseFloat(volume24hSol);
  return Number.isFinite(n) ? n : null;
}

function parseMarketCapSol(marketCapSol: string | null): number | null {
  if (marketCapSol == null) return null;
  const n = Number.parseFloat(marketCapSol);
  return Number.isFinite(n) ? n : null;
}

function indexPriceChange24hClass(priceChange24hPct: number | null | undefined): string | null {
  if (priceChange24hPct == null || !Number.isFinite(priceChange24hPct)) return null;
  return priceChange24hPct >= 0 ? "text-emerald-400" : "text-pink-400";
}

export function sortIndexRows(
  rows: TensorCollectionIndexRow[],
  sortKey: TensorIndexSortKey,
  sortDir: TensorIndexSortDir,
): TensorCollectionIndexRow[] {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sortKey === "listed") {
      const av = a.listedCount ?? -1;
      const bv = b.listedCount ?? -1;
      return (av - bv) * dir;
    }
    if (sortKey === "listedPct") {
      const av = a.listedPct;
      const bv = b.listedPct;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av - bv) * dir;
    }
    if (sortKey === "volume24h") {
      const av = parseVolume24hSol(a.volume24hSol);
      const bv = parseVolume24hSol(b.volume24hSol);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av - bv) * dir;
    }
    if (sortKey === "marketCap") {
      const av = parseMarketCapSol(a.marketCapSol);
      const bv = parseMarketCapSol(b.marketCapSol);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av - bv) * dir;
    }
    if (sortKey === "sellNow") {
      const av = parseFloorSol(a.sellNowSol);
      const bv = parseFloorSol(b.sellNowSol);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av - bv) * dir;
    }
    if (sortKey === "priceChange24h") {
      const av = a.priceChange24hPct;
      const bv = b.priceChange24hPct;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av - bv) * dir;
    }
    const av = parseFloorSol(a.floorSol);
    const bv = parseFloorSol(b.floorSol);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return (av - bv) * dir;
  });
}

function SortableHeader({
  label,
  active,
  dir,
  onClick,
  align = "left",
  className,
}: {
  label: string;
  active: boolean;
  dir: TensorIndexSortDir;
  onClick: () => void;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-3 py-2 font-semibold",
        align === "right" && "text-right",
        className,
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-[var(--tensor-white)]",
          align === "right" && "ml-auto",
          active ? "text-[var(--tensor-white)]" : "text-[var(--trade-muted)]",
        )}
        aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      >
        {label}
        {active ? (
          <span className="font-mono text-[9px]" aria-hidden>
            {dir === "asc" ? "↑" : "↓"}
          </span>
        ) : null}
      </button>
    </th>
  );
}

export function IndexCollectionThumb({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl?: string | null;
}) {
  return (
    <span
      className="trade-index-row__thumb flex size-7 shrink-0 items-center justify-center overflow-hidden rounded border border-[#333] bg-[var(--trade-panel)] text-[9px] font-bold uppercase text-[var(--trade-muted)]"
      aria-hidden
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="size-full object-cover" />
      ) : (
        name.slice(0, 2)
      )}
    </span>
  );
}

function indexTableMetricVisibility(rows: TensorCollectionIndexRow[]) {
  return {
    /** Tensor homepage always shows these columns; cells use "—" when unkeyed. */
    listedPct: true,
    marketCap: rows.some((row) => row.marketCapSol != null),
    volume24h: true,
    priceChange24h: true,
  };
}

/** Collection index table — Tensor homepage columns with sortable floor, listed, and 24h vol. */
export function TensorCollectionIndexTable({
  rows,
  className,
  sortKey: controlledSortKey,
  sortDir: controlledSortDir,
  onSortChange,
}: IndexTableProps) {
  const [internalSortKey, setInternalSortKey] = useState<TensorIndexSortKey>("listed");
  const [internalSortDir, setInternalSortDir] = useState<TensorIndexSortDir>("desc");

  const sortKey = controlledSortKey ?? internalSortKey;
  const sortDir = controlledSortDir ?? internalSortDir;

  const sortedRows = useMemo(
    () => sortIndexRows(rows, sortKey, sortDir),
    [rows, sortKey, sortDir],
  );

  const metrics = useMemo(() => indexTableMetricVisibility(rows), [rows]);

  const toggleSort = (key: TensorIndexSortKey) => {
    const nextDir: TensorIndexSortDir =
      sortKey === key
        ? sortDir === "asc"
          ? "desc"
          : "asc"
        : key === "listed" ||
            key === "listedPct" ||
            key === "marketCap" ||
            key === "volume24h" ||
            key === "priceChange24h"
          ? "desc"
          : "asc";
    if (onSortChange) {
      onSortChange(key, nextDir);
    } else {
      setInternalSortKey(key);
      setInternalSortDir(nextDir);
    }
  };

  return (
    <div className={cn("overflow-x-auto rounded-lg border border-[#333]", className)}>
      <table className="trade-index-table w-full min-w-[36rem] text-left text-[11px]">
        <colgroup>
          <col className="trade-index-col-collection" />
          <col className="trade-index-col-numeric" />
          <col className="trade-index-col-numeric" />
          <col className="trade-index-col-numeric" />
          {metrics.listedPct ? <col className="trade-index-col-numeric" /> : null}
          {metrics.marketCap ? <col className="trade-index-col-numeric" /> : null}
          {metrics.volume24h ? <col className="trade-index-col-numeric" /> : null}
          {metrics.priceChange24h ? <col className="trade-index-col-numeric" /> : null}
          <col className="trade-index-col-venue" />
        </colgroup>
        <thead className="border-b border-[#333] bg-[var(--trade-surface)] text-[10px] uppercase tracking-wide text-[var(--trade-muted)]">
          <tr className="h-10">
            <th className="px-3 py-1.5 font-semibold">Collection</th>
            <SortableHeader
              label="FLOOR"
              active={sortKey === "floor"}
              dir={sortDir}
              onClick={() => toggleSort("floor")}
              align="right"
              className="trade-index-numeric"
            />
            <SortableHeader
              label="SELL NOW"
              active={sortKey === "sellNow"}
              dir={sortDir}
              onClick={() => toggleSort("sellNow")}
              align="right"
              className="trade-index-numeric"
            />
            <SortableHeader
              label="Listed"
              active={sortKey === "listed"}
              dir={sortDir}
              onClick={() => toggleSort("listed")}
              align="right"
              className="trade-index-numeric"
            />
            {metrics.listedPct ? (
              <SortableHeader
                label="Listed %"
                active={sortKey === "listedPct"}
                dir={sortDir}
                onClick={() => toggleSort("listedPct")}
                align="right"
                className="trade-index-numeric"
              />
            ) : null}
            {metrics.marketCap ? (
              <SortableHeader
                label="Market cap"
                active={sortKey === "marketCap"}
                dir={sortDir}
                onClick={() => toggleSort("marketCap")}
                align="right"
                className="trade-index-numeric"
              />
            ) : null}
            {metrics.volume24h ? (
              <SortableHeader
                label="24H VOL"
                active={sortKey === "volume24h"}
                dir={sortDir}
                onClick={() => toggleSort("volume24h")}
                align="right"
                className="trade-index-numeric"
              />
            ) : null}
            {metrics.priceChange24h ? (
              <SortableHeader
                label="24H Δ"
                active={sortKey === "priceChange24h"}
                dir={sortDir}
                onClick={() => toggleSort("priceChange24h")}
                align="right"
                className="trade-index-numeric"
              />
            ) : null}
            <th className="px-3 py-1.5 font-semibold">Venue</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => (
            <tr
              key={row.slug}
              className="border-b border-[#333]/70 last:border-b-0 hover:bg-[var(--trade-panel)]/40"
            >
              <td className="px-3 py-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="trade-index-row__rank w-5 shrink-0 text-right font-mono text-[10px] tabular-nums text-[var(--trade-muted)]">
                    {index + 1}
                  </span>
                  <IndexCollectionThumb name={row.name} imageUrl={row.imageUrl} />
                  <Link
                    href={row.href}
                    className="min-w-0 truncate font-medium text-[var(--tensor-white)] hover:text-[var(--tensor-accent)]"
                    data-growth-event="trade_collection_index"
                    data-growth-context={`trade_index:${row.slug}`}
                  >
                    {row.name}
                  </Link>
                </div>
              </td>
              <td className="trade-index-numeric px-3 py-1.5 font-mono text-[11px] tabular-nums text-[var(--tensor-white)]">
                {row.floorSol != null ? `${row.floorSol} ◎` : "—"}
              </td>
              <td className="trade-index-numeric px-3 py-1.5 font-mono text-[11px] tabular-nums text-[var(--tensor-white)]">
                {row.sellNowSol != null ? `${row.sellNowSol} ◎` : "—"}
              </td>
              <td className="trade-index-numeric px-3 py-1.5 font-mono text-[11px] tabular-nums text-[var(--tensor-white)]">
                {row.listedCount != null ? row.listedCount : "—"}
              </td>
              {metrics.listedPct ? (
                <td className="trade-index-numeric px-3 py-1.5 font-mono text-[11px] tabular-nums text-[var(--tensor-white)]">
                  {row.listedPct != null ? `${row.listedPct}%` : "—"}
                </td>
              ) : null}
              {metrics.marketCap ? (
                <td className="trade-index-numeric px-3 py-1.5 font-mono text-[11px] tabular-nums text-[var(--tensor-white)]">
                  {row.marketCapSol != null ? `${row.marketCapSol} ◎` : "—"}
                </td>
              ) : null}
              {metrics.volume24h ? (
                <td className="trade-index-numeric px-3 py-1.5 font-mono text-[11px] tabular-nums text-[var(--tensor-white)]">
                  {row.volume24hSol != null ? `${row.volume24hSol} ◎` : "—"}
                </td>
              ) : null}
              {metrics.priceChange24h ? (
                <td
                  className={cn(
                    "trade-index-numeric px-3 py-2 font-mono text-xs tabular-nums",
                    indexPriceChange24hClass(row.priceChange24hPct) ??
                      "text-[var(--tensor-white)]",
                  )}
                >
                  {formatPriceChange24h(row.priceChange24hPct)}
                </td>
              ) : null}
              <td className="px-3 py-1.5">
                <VenueBadge partner={row.partner} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function sellNowFromPreview(collection: TradeLandingCollectionPreview): string | null {
  const listed = collection.listedCount ?? 0;
  if (listed <= 0) return null;
  return collection.sellNowSol ?? collection.floorSol;
}

export function mapPreviewToIndexRow(
  collection: TradeLandingCollectionPreview,
): TensorCollectionIndexRow {
  return {
    slug: collection.slug,
    name: collection.name,
    href: collection.href,
    imageUrl: collection.imageUrl ?? null,
    floorSol: collection.floorSol,
    sellNowSol: sellNowFromPreview(collection),
    listedCount: collection.listedCount,
    listedPct: collection.listedPct ?? null,
    volume24hSol: collection.volume24hSol ?? null,
    marketCapSol: collection.marketCapSol ?? null,
    priceChange24hPct: collection.priceChange24hPct ?? null,
    status: collection.status,
    partner: collection.partner,
  };
}
