"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { TradeActivityFeed } from "@/components/trade-activity-feed";
import { TradeLandingFeaturedBanner } from "@/components/trade/trade-landing-featured-banner";
import { TradeLandingMarketPulse } from "@/components/trade/trade-landing-market-pulse";
import { TradeLandingValueHero } from "@/components/trade/trade-landing-value-hero";
import { VenueBadge } from "@/components/trade/venue-badge";
import {
  TradeLandingIndexToolbar,
  type TradeLandingIndexView,
  type TradeLandingTimeframe,
} from "@/components/trade/trade-landing-index-toolbar";
import {
  IndexCollectionThumb,
  mapPreviewToIndexRow,
  TensorCollectionIndexTable,
  type TensorIndexSortDir,
  type TensorIndexSortKey,
} from "@/components/trade/tensor/collection-desk-layout";
import { TradeDeskShell } from "@/components/trade/trade-desk-shell";
import {
  getTradeLandingAggregateFromCollections,
  type TradeLandingAggregateStats,
} from "@/lib/trade-landing-aggregate";
import type {
  TradeLandingCollectionPreview,
  TradeLandingStats,
} from "@/lib/trade-landing";
import { formatPriceChange24h } from "@/lib/trade/tensor-ribbon-metrics";
import {
  DEFAULT_TRADE_LANDING_INDEX_VIEW,
  readTradeLandingTimeframePreference,
  readTradeLandingViewPreference,
  writeTradeLandingTimeframePreference,
  writeTradeLandingViewPreference,
} from "@/lib/trade-landing-view-prefs";
import { TRADE_ROUTES } from "@/lib/trade-routes";

type Props = {
  collections: TradeLandingCollectionPreview[];
  landingAggregateOverride?: TradeLandingAggregateStats;
  landingStats: TradeLandingStats;
  activity?: import("@/lib/trade/trade-activity").TradeActivityFeedResult;
};

/** Floor vs sell-now gap (◎), as % of floor — Tensor CARDS spread. */
export function computeLandingCollectionSpreadPct(
  collection: TradeLandingCollectionPreview,
): number | null {
  const listed = collection.listedCount ?? 0;
  if (listed <= 0) return null;
  const sellNow = collection.sellNowSol ?? collection.floorSol;
  const floor = collection.floorSol;
  if (floor == null || sellNow == null) return null;
  const floorN = Number.parseFloat(floor);
  const sellN = Number.parseFloat(sellNow);
  if (!Number.isFinite(floorN) || !Number.isFinite(sellN) || floorN <= 0) return null;
  return ((floorN - sellN) / floorN) * 100;
}

export function filterLandingIndexRowsByCollection(
  rows: ReturnType<typeof mapPreviewToIndexRow>[],
  query: string,
) {
  const trimmed = query.trim();
  if (!trimmed) return rows;
  const needle = trimmed.toLowerCase();
  return rows.filter(
    (row) =>
      row.name.toLowerCase().includes(needle) || row.slug.toLowerCase().includes(needle),
  );
}

export function applyLandingIndexOrder(
  rows: ReturnType<typeof mapPreviewToIndexRow>[],
  options: {
    trending: boolean;
    newMints?: boolean;
    timeframe: TradeLandingTimeframe;
    sortKey: TensorIndexSortKey;
    sortDir: TensorIndexSortDir;
  },
) {
  let filtered = rows;
  if (options.newMints) {
    const recent = rows.filter(
      (r) => r.status === "preview" || r.status === "index_pending",
    );
    filtered = recent.length > 0 ? recent : rows;
  } else if (options.trending) {
    const live = rows.filter((r) => r.status === "live");
    filtered = live.length > 0 ? live : rows;
  }

  const dir = options.sortDir === "asc" ? 1 : -1;
  return [...filtered].sort((a, b) => {
    if (
      (options.timeframe === "1h" || options.timeframe === "24h") &&
      options.trending
    ) {
      const av = a.listedCount ?? -1;
      const bv = b.listedCount ?? -1;
      return (bv - av) * (options.sortDir === "desc" ? 1 : -1);
    }
    if (options.sortKey === "listed") {
      const av = a.listedCount ?? -1;
      const bv = b.listedCount ?? -1;
      return (av - bv) * dir;
    }
    if (options.sortKey === "listedPct") {
      const av = a.listedPct;
      const bv = b.listedPct;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av - bv) * dir;
    }
    if (options.sortKey === "volume24h") {
      const av = a.volume24hSol != null ? Number.parseFloat(a.volume24hSol) : Number.NaN;
      const bv = b.volume24hSol != null ? Number.parseFloat(b.volume24hSol) : Number.NaN;
      if (!Number.isFinite(av) && !Number.isFinite(bv)) return 0;
      if (!Number.isFinite(av)) return 1;
      if (!Number.isFinite(bv)) return -1;
      return (av - bv) * dir;
    }
    if (options.sortKey === "marketCap") {
      const av = a.marketCapSol != null ? Number.parseFloat(a.marketCapSol) : Number.NaN;
      const bv = b.marketCapSol != null ? Number.parseFloat(b.marketCapSol) : Number.NaN;
      if (!Number.isFinite(av) && !Number.isFinite(bv)) return 0;
      if (!Number.isFinite(av)) return 1;
      if (!Number.isFinite(bv)) return -1;
      return (av - bv) * dir;
    }
    if (options.sortKey === "sellNow") {
      const av = a.sellNowSol != null ? Number.parseFloat(a.sellNowSol) : Number.NaN;
      const bv = b.sellNowSol != null ? Number.parseFloat(b.sellNowSol) : Number.NaN;
      if (!Number.isFinite(av) && !Number.isFinite(bv)) return 0;
      if (!Number.isFinite(av)) return 1;
      if (!Number.isFinite(bv)) return -1;
      return (av - bv) * dir;
    }
    if (options.sortKey === "priceChange24h") {
      const av = a.priceChange24hPct;
      const bv = b.priceChange24hPct;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av - bv) * dir;
    }
    const af = a.floorSol != null ? Number.parseFloat(a.floorSol) : Number.NaN;
    const bf = b.floorSol != null ? Number.parseFloat(b.floorSol) : Number.NaN;
    if (!Number.isFinite(af) && !Number.isFinite(bf)) return 0;
    if (!Number.isFinite(af)) return 1;
    if (!Number.isFinite(bf)) return -1;
    return (af - bf) * dir;
  });
}

export function TradeLandingDeskClient({
  collections,
  landingAggregateOverride,
  landingStats,
  activity,
}: Props) {
  const router = useRouter();
  const indexRows = useMemo(
    () => collections.map(mapPreviewToIndexRow),
    [collections],
  );

  const [view, setView] = useState<TradeLandingIndexView>(DEFAULT_TRADE_LANDING_INDEX_VIEW);
  const [timeframe, setTimeframe] = useState<TradeLandingTimeframe>("24h");
  const [trending, setTrending] = useState(true);
  const [newMints, setNewMints] = useState(false);
  const [sortKey, setSortKey] = useState<TensorIndexSortKey>("listed");
  const [sortDir, setSortDir] = useState<TensorIndexSortDir>("desc");
  const [collectionFilter, setCollectionFilter] = useState("");

  useEffect(() => {
    const storedView = readTradeLandingViewPreference();
    if (storedView) setView(storedView);
    const storedTf = readTradeLandingTimeframePreference();
    if (storedTf) {
      setTimeframe(storedTf);
      setTrending(false);
    }
  }, []);

  const handleViewChange = useCallback((next: TradeLandingIndexView) => {
    setView(next);
    writeTradeLandingViewPreference(next);
  }, []);

  const handleTimeframeChange = useCallback((next: TradeLandingTimeframe) => {
    setTimeframe(next);
    setTrending(false);
    setNewMints(false);
    writeTradeLandingTimeframePreference(next);
    if (next === "1h" || next === "24h") {
      setSortKey("listed");
      setSortDir("desc");
    } else {
      setSortKey("floor");
      setSortDir("asc");
    }
  }, []);

  const handleTrending = useCallback(() => {
    setTrending(true);
    setNewMints(false);
    setSortKey("listed");
    setSortDir("desc");
  }, []);

  const handleNewMints = useCallback(() => {
    setNewMints(true);
    setTrending(false);
    setSortKey("listed");
    setSortDir("desc");
  }, []);

  const handleSortChange = useCallback((key: TensorIndexSortKey, dir: TensorIndexSortDir) => {
    setSortKey(key);
    setSortDir(dir);
    setTrending(false);
    setNewMints(false);
  }, []);

  const handleRefreshCollections = useCallback(() => {
    router.refresh();
  }, [router]);

  const orderedRows = useMemo(
    () =>
      applyLandingIndexOrder(indexRows, {
        trending,
        newMints: newMints,
        timeframe,
        sortKey,
        sortDir,
      }),
    [indexRows, trending, newMints, timeframe, sortKey, sortDir],
  );

  const filteredRows = useMemo(
    () => filterLandingIndexRowsByCollection(orderedRows, collectionFilter),
    [orderedRows, collectionFilter],
  );

  const liveCollections = collections.filter((c) => c.status === "live");
  const firstLiveCollection = liveCollections[0] ?? null;
  const landingAggregate = useMemo(
    () =>
      landingAggregateOverride ??
      getTradeLandingAggregateFromCollections(collections),
    [landingAggregateOverride, collections],
  );
  const hasAggregateListings = landingAggregate.listedCount > 0;
  const featuredName = hasAggregateListings
    ? "All partner listings"
    : (firstLiveCollection?.name ?? "GRAILS partner collections");
  const featuredTagline = hasAggregateListings
    ? "Merged desk across CC, Phygitals, SlabVault treasury, and preview venues — not a single marketplace."
    : "Graded slabs across partner venues — open a collection desk when ingest is live.";
  const featuredBuyHref = hasAggregateListings
    ? TRADE_ROUTES.all
    : firstLiveCollection?.href ?? null;
  const featuredBuyNowSol = hasAggregateListings
    ? landingAggregate.buyNowSol ?? landingAggregate.floorSol
    : liveCollections[0]?.floorSol ?? landingAggregate.buyNowSol;
  const featuredSellNowSol = hasAggregateListings
    ? landingAggregate.sellNowSol
    : liveCollections[0] != null && (liveCollections[0].listedCount ?? 0) > 0
      ? (liveCollections[0].sellNowSol ?? liveCollections[0].floorSol)
      : landingAggregate.sellNowSol;
  const featuredVolume24hSol = hasAggregateListings
    ? landingAggregate.volume24hSol
    : liveCollections[0]?.volume24hSol ?? landingAggregate.volume24hSol;
  const featuredListedCount = hasAggregateListings
    ? landingAggregate.listedCount
    : liveCollections[0]?.listedCount ?? landingAggregate.listedCount;

  const activityPanel =
    activity != null ? (
      <TradeActivityFeed
        events={activity.events}
        source={activity.source}
        compact
        collectionSlug={firstLiveCollection?.slug}
      />
    ) : (
      <TradeActivityFeed events={[]} source="unconfigured" compact />
    );

  return (
    <TradeDeskShell collections={collections} activity={activityPanel}>
      <TradeLandingValueHero />

      <TradeLandingMarketPulse aggregate={landingAggregate} stats={landingStats} />

      <TradeLandingFeaturedBanner
        collectionName={featuredName}
        tagline={featuredTagline}
        buyHref={featuredBuyHref}
        buyNowSol={
          featuredBuyNowSol != null ? String(featuredBuyNowSol) : null
        }
        sellNowSol={
          featuredSellNowSol != null ? String(featuredSellNowSol) : null
        }
        volume24hSol={
          featuredVolume24hSol != null ? String(featuredVolume24hSol) : null
        }
        marketCapSol={firstLiveCollection?.marketCapSol ?? null}
        listedCount={featuredListedCount}
        listedPct={hasAggregateListings ? null : firstLiveCollection?.listedPct ?? null}
      />

      <section
        id="trade-collections-index"
        aria-labelledby="trade-collections-index-heading"
        className="space-y-3 scroll-mt-4"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2
              id="trade-collections-index-heading"
              className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--tensor-white)]"
            >
              Collection index
            </h2>
            <p className="mt-0.5 text-[10px] text-[var(--trade-muted)]">
              {filteredRows.length} set{filteredRows.length === 1 ? "" : "s"}
              {collectionFilter.trim() ? " matching filter" : ""}
              {" · "}
              merged partner desks on{" "}
              <Link
                href={TRADE_ROUTES.all}
                className="font-semibold text-[var(--tensor-accent)] hover:underline"
              >
                All listings
              </Link>
            </p>
          </div>
          {liveCollections.length > 0 ? (
            <Link
              href={TRADE_ROUTES.all}
              className="text-[10px] font-bold uppercase tracking-wide text-[var(--tensor-accent)] hover:underline"
            >
              All listings →
            </Link>
          ) : null}
        </div>

        <TradeLandingIndexToolbar
          view={view}
          onViewChange={handleViewChange}
          timeframe={timeframe}
          onTimeframeChange={handleTimeframeChange}
          trendingActive={trending}
          onTrendingChange={(active) => {
            if (active) handleTrending();
          }}
          newMintsActive={newMints}
          onNewMintsChange={(active) => {
            if (active) handleNewMints();
          }}
          collectionFilter={collectionFilter}
          onCollectionFilterChange={setCollectionFilter}
          onRefreshCollections={handleRefreshCollections}
        />

        {filteredRows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#333] bg-[var(--trade-surface)] px-4 py-8 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--tensor-white)]">
              No collections match
            </p>
            <p className="mt-1 text-xs text-[var(--trade-muted)]">
              {collectionFilter.trim()
                ? "Try a different filter or clear the search."
                : "Partner ingest has not loaded yet. Run npm run sync:discover — no placeholder rows are shown."}
            </p>
          </div>
        ) : view === "table" ? (
          <TensorCollectionIndexTable
            rows={filteredRows}
            sortKey={sortKey}
            sortDir={sortDir}
            onSortChange={handleSortChange}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {filteredRows.map((row) => {
              const collection = collections.find((c) => c.slug === row.slug);
              return collection ? (
                <TradeLandingIndexCardTile
                  key={row.slug}
                  row={row}
                  collection={collection}
                />
              ) : null;
            })}
          </div>
        )}
      </section>

      <section
        className="trade-landing-activity-teaser mt-4 xl:hidden"
        aria-label="Recent activity preview"
      >
        <div className="overflow-hidden rounded-lg border border-[#333] bg-[var(--trade-surface)]">
          {activityPanel}
        </div>
      </section>
    </TradeDeskShell>
  );
}

const LANDING_CARD_STATUS_LABELS: Record<
  TradeLandingCollectionPreview["status"],
  string
> = {
  preview: "Preview",
  index_pending: "Index",
  live: "Live",
};

type LandingIndexCardTileProps = {
  row: ReturnType<typeof mapPreviewToIndexRow>;
  collection: TradeLandingCollectionPreview;
};

/** CARDS view tile — venue badge + floor/sell-now from index row (Tensor parity). */
function TradeLandingIndexCardTile({ row, collection }: LandingIndexCardTileProps) {
  const spreadPct = computeLandingCollectionSpreadPct(collection);

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-[#333] bg-[var(--trade-panel)] transition-colors hover:border-[#555]">
      <div className="flex items-start justify-between gap-2 border-b border-[#333] px-3 py-2.5">
        <div className="flex min-w-0 items-start gap-2">
          <IndexCollectionThumb name={row.name} imageUrl={row.imageUrl} />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-[var(--tensor-white)]">
              {collection.name}
            </h3>
          {spreadPct != null ? (
            <p
              className={`font-mono text-[10px] font-bold tabular-nums ${
                spreadPct > 0 ? "text-pink-400" : "text-emerald-400"
              }`}
            >
              Spread: {spreadPct.toFixed(2)}%
            </p>
          ) : null}
            <p className="line-clamp-2 text-[10px] leading-snug text-[var(--trade-muted)]">
              {collection.description}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <VenueBadge partner={row.partner} />
          <span className="text-[9px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
            {LANDING_CARD_STATUS_LABELS[collection.status]}
          </span>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 border-t border-[#333] px-3 py-2.5 text-xs">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-emerald-400/90">
            BUY NOW
          </dt>
          <dd className="font-mono font-bold tabular-nums text-emerald-300">
            {row.floorSol != null ? `${row.floorSol} ◎` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-pink-400/90">
            SELL NOW
          </dt>
          <dd className="font-mono font-bold tabular-nums text-red-300">
            {row.sellNowSol != null ? `${row.sellNowSol} ◎` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
            Listed %
          </dt>
          <dd className="font-mono font-bold tabular-nums text-[var(--tensor-white)]">
            {row.listedPct != null ? `${row.listedPct}%` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
            24h vol
          </dt>
          <dd className="font-mono font-bold tabular-nums text-[var(--tensor-white)]">
            {row.volume24hSol != null ? `${row.volume24hSol} ◎` : "—"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
            24h Δ
          </dt>
          <dd className="font-mono font-bold tabular-nums text-[var(--tensor-white)]">
            {formatPriceChange24h(row.priceChange24hPct)}
          </dd>
        </div>
      </dl>

      <Link
        href={row.href}
        className="mt-auto border-t border-[#333] px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-[var(--tensor-accent)] transition-colors hover:bg-[var(--trade-surface)]"
        data-growth-event="trade_collection_index_card"
        data-growth-context={`trade_card:${row.slug}`}
      >
        Open collection
      </Link>
    </article>
  );
}
