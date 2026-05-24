"use client";

import Link from "next/link";
import {
  Suspense,
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { EmptyState } from "@/components/empty-state";
import { CollectionBidsPanel } from "@/components/trade/collection-bids-panel";
import { CollectionInfoPanel } from "@/components/trade/collection-info-panel";
import { CollectionHoldersPanel } from "@/components/trade/collection-holders-panel";
import { CollectionOrdersPanel } from "@/components/trade/collection-orders-panel";
import { CollectionTraitsPanel } from "@/components/trade/collection-traits-panel";
import { TradeActivityPanel } from "@/components/trade/trade-activity-panel";
import { CollectionStatsRibbon } from "@/components/trade/collection-stats-ribbon";
import { TradeDeskShell } from "@/components/trade/trade-desk-shell";
import type { TradeCollectionSocialLinks } from "@/components/trade/trade-desk-header";
import { TradeDeskToolbar } from "@/components/trade/trade-desk-toolbar";
import { TradeFilterDrawer } from "@/components/trade/trade-filter-drawer";
import { TradeInstantSellModal } from "@/components/trade/trade-instant-sell-modal";
import { TradeListingGrid } from "@/components/trade/trade-listing-grid";
import { TradePortfolioEmptyGrid } from "@/components/trade/trade-portfolio-empty-grid";
import { TensorTradePanel } from "@/components/trade/tensor/trade-panel";
import { useTradeDeskFilters } from "@/components/trade/use-trade-desk-filters";
import { TradeTraitFilters } from "@/components/trade/trade-trait-filters";
import { Button } from "@/components/ui/button";
import type { TradeGridDensity } from "@/lib/layout";
import type { TradeCollectionConfig } from "@/lib/onchain/collections";
import type { PartnerTradeListingsResult } from "@/lib/partner-listings";
import type { TradeLandingCollectionPreview } from "@/lib/trade-landing";
import type { TradeCollectionDepth } from "@/lib/trade/tensor-collection-depth";
import type { TensorRibbonMetrics } from "@/lib/trade/tensor-ribbon-metrics";
import {
  computeTradeCollectionStats,
  DEFAULT_TRADE_FILTERS,
  extractUniqueGrades,
  filterTradeListings,
  mapSlabsToTradeListings,
  sortTradeListings,
  type TradeListing,
  type TradeListingSort,
} from "@/lib/trade-listings";
import type { TradeActivityFeedResult } from "@/lib/trade/trade-activity";
import type { MarketplaceListResult } from "@/lib/marketplace-slabs";
import { TRADE_ROUTES } from "@/lib/trade-routes";
import { cn } from "@/lib/utils";
import { WalletButton } from "@/components/wallet-button";

export type TradeCollectionPartnerMeta = {
  source: "partner_ingest";
  fromFallback: boolean;
  dbStatus: PartnerTradeListingsResult["dbStatus"];
  sources: PartnerTradeListingsResult["sources"];
};

type Props = {
  collection: TradeCollectionConfig;
  collectionSocialLinks?: TradeCollectionSocialLinks;
  collections: TradeLandingCollectionPreview[];
  listings: TradeListing[];
  stats: ReturnType<typeof computeTradeCollectionStats>;
  partnerMeta?: TradeCollectionPartnerMeta;
  depth?: TradeCollectionDepth;
  tensorRibbon?: TensorRibbonMetrics | null;
  listResult?: MarketplaceListResult;
  activity: TradeActivityFeedResult;
  /** When false, activity panel shows honest empty state instead of synthetic preview. */
  syntheticActivity?: boolean;
  /** Nav highlight slug — defaults to `collection.slug`; use `all` on aggregate desk. */
  navActiveSlug?: string;
  /** Distinct partner venues on aggregate desk stats ribbon. */
  venuesCount?: number;
  /** Aggregate all-platform desk — adjusts header badge and empty copy. */
  aggregateDesk?: boolean;
  /** Merged all-listings nav stats — overrides preview sum on `/trade/all`. */
  navAggregateOverride?: {
    listedCount: number;
    floorSol: number | null;
  };
};

type CollectionDeskTab =
  | "items"
  | "info"
  | "activity"
  | "bids"
  | "orders"
  | "traits"
  | "holders"
  | "collection_bid";

const COLLECTION_TAB_IDS = [
  "items",
  "info",
  "activity",
  "bids",
  "orders",
  "traits",
  "holders",
  "collection_bid",
] as const satisfies readonly CollectionDeskTab[];

const COLLECTION_TABS: { id: CollectionDeskTab; label: string; soon?: boolean }[] = [
  { id: "items", label: "ITEMS" },
  { id: "info", label: "INFO" },
  { id: "activity", label: "ACTIVITY" },
  { id: "bids", label: "BIDS" },
  { id: "orders", label: "ORDERS" },
  { id: "traits", label: "TRAITS" },
  { id: "holders", label: "HODLERS" },
  { id: "collection_bid", label: "COLLECTION BID", soon: true },
];

function resolveEmptyListingsDescription({
  aggregateDesk,
  depth,
  partnerMeta,
}: {
  aggregateDesk: boolean;
  depth?: TradeCollectionDepth;
  partnerMeta?: TradeCollectionPartnerMeta;
}): string {
  if (aggregateDesk) {
    return "No partner listings indexed yet. Run npm run sync:discover to ingest CC and Phygitals rows, or list vault treasury slabs.";
  }

  if (partnerMeta) {
    if (partnerMeta.dbStatus === "unreachable") {
      return "Partner ingest database is unreachable and the external seed has no rows for this collection.";
    }
    if (partnerMeta.fromFallback) {
      return "Partner ingest seed has no rows for this collection. Run npm run sync:discover to refresh external listings.";
    }
    return "No active listings for this collection right now. Listings appear after the next partner sync.";
  }

  if (depth?.source === "unconfigured") {
    return "Tensor read is not configured for this collection. Partner ingest or treasury inventory is required.";
  }

  if (depth?.source === "partner_ingest") {
    return "Partner ingest returned no rows. Run npm run sync:discover or add listings to the external seed.";
  }

  return "Listings appear here when inventory is indexed or vault slabs are marked available.";
}

function DeskCrossLinks({ aggregateDesk }: { aggregateDesk: boolean }) {
  return (
    <p className="mb-3 text-[10px] leading-relaxed text-[var(--trade-muted)]">
      {aggregateDesk ? (
        <>
          Merged CC · Phygitals · treasury listings on one desk ·{" "}
          <Link
            href={TRADE_ROUTES.collectionsIndex}
            className="font-semibold text-[var(--tensor-accent)] hover:underline"
            data-growth-event="trade_desk_crosslink"
            data-growth-context="aggregate_to_collection_index"
          >
            Browse collection index
          </Link>
        </>
      ) : (
        <>
          Single partner collection desk ·{" "}
          <Link
            href={TRADE_ROUTES.all}
            className="font-semibold text-[var(--tensor-accent)] hover:underline"
            data-growth-event="trade_desk_crosslink"
            data-growth-context="collection_to_all_listings"
          >
            View all listings
          </Link>
        </>
      )}
    </p>
  );
}

export function TradeCollectionDeskClient(props: Props) {
  return (
    <Suspense fallback={null}>
      <TradeCollectionDeskClientInner {...props} />
    </Suspense>
  );
}

function TradeCollectionDeskClientInner({
  collection,
  collections,
  collectionSocialLinks,
  listings,
  stats,
  partnerMeta,
  depth,
  tensorRibbon,
  listResult,
  activity,
  syntheticActivity = false,
  navActiveSlug,
  venuesCount,
  aggregateDesk = false,
  navAggregateOverride,
}: Props) {
  const [filters, setFilters] = useTradeDeskFilters();
  const [sort, setSort] = useState<TradeListingSort>("price_asc");
  const [gridDensity, setGridDensity] = useState<TradeGridDensity>("m");
  const [activeTab, setActiveTab] = useState<CollectionDeskTab>("items");
  const [panelMode, setPanelMode] = useState<"buy" | "sell">("buy");
  const [refreshKey, setRefreshKey] = useState(0);
  const [instantSellOpen, setInstantSellOpen] = useState(false);
  const { connected } = useWallet();
  const collectionTabsRef = useRef<HTMLDivElement>(null);

  const handlePanelModeChange = useCallback((mode: "buy" | "sell") => {
    setPanelMode(mode);
    if (mode === "sell") {
      setActiveTab("items");
    }
  }, []);

  const focusCollectionTab = useCallback((tabId: CollectionDeskTab) => {
    collectionTabsRef.current
      ?.querySelector<HTMLButtonElement>(`[data-collection-tab="${tabId}"]`)
      ?.focus();
  }, []);

  const handleCollectionTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, tabId: CollectionDeskTab) => {
      const index = COLLECTION_TAB_IDS.indexOf(tabId);
      if (index < 0) return;

      let nextIndex: number | null = null;
      if (event.key === "ArrowRight") {
        nextIndex = (index + 1) % COLLECTION_TAB_IDS.length;
      } else if (event.key === "ArrowLeft") {
        nextIndex = (index - 1 + COLLECTION_TAB_IDS.length) % COLLECTION_TAB_IDS.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = COLLECTION_TAB_IDS.length - 1;
      }

      if (nextIndex === null) return;

      event.preventDefault();
      const nextTab = COLLECTION_TAB_IDS[nextIndex]!;
      setActiveTab(nextTab);
      focusCollectionTab(nextTab);
    },
    [focusCollectionTab],
  );

  const filteredListings = useMemo(
    () => sortTradeListings(filterTradeListings(listings, filters), sort),
    [listings, filters, sort],
  );
  const availableGrades = useMemo(
    () => extractUniqueGrades(listings),
    [listings],
  );
  const sellNowSol = tensorRibbon?.sellNowSol ?? stats.floorSol;

  const { fromFallback, dbStatus, dbHint } = listResult ?? {
    fromFallback: false,
    dbStatus: "connected" as const,
    dbHint: undefined,
  };

  const statusBanner = renderStatusBanner({
    aggregateDesk,
    partnerMeta,
    depth,
    fromFallback,
    dbStatus,
    dbHint,
  });

  return (
    <TradeDeskShell
      collections={collections}
      activeSlug={navActiveSlug ?? collection.slug}
      aggregateListedCount={
        navAggregateOverride?.listedCount ??
        (aggregateDesk ? stats.listedCount : undefined)
      }
      aggregateFloorSol={
        navAggregateOverride?.floorSol ??
        (aggregateDesk ? stats.floorSol : undefined)
      }
      activeCollection={{
        name: collection.name,
        partner: collection.partner,
        verified: aggregateDesk ? false : collection.status === "live",
        venueLabel: aggregateDesk ? "ALL" : undefined,
        ...collectionSocialLinks,
      }}
      tradePanel={
        <TensorTradePanel
          className="min-h-0 flex-1"
          collectionSlug={collection.slug}
          listings={listings}
          floorSol={stats.floorSol}
          aggregateDesk={aggregateDesk}
          onModeChange={handlePanelModeChange}
        />
      }
      sidebar={
        <TradeTraitFilters
          listings={listings}
          availableGrades={availableGrades}
          filters={filters}
          onFiltersChange={setFilters}
          resultCount={filteredListings.length}
          aggregateDesk={aggregateDesk}
          compact
        />
      }
      activity={
        <div className="trade-desk-pro-activity-inner flex min-h-0 flex-1 flex-col overflow-hidden xl:max-h-none [&_.trade-activity-feed]:min-h-0 [&_.trade-activity-feed]:flex-1 [&_.trade-activity-feed_ol]:max-h-none [&_.trade-activity-feed_ol]:min-h-0 [&_.trade-activity-feed_ol]:flex-1 [&_.trade-activity-feed_ol]:overflow-y-auto">
          <TradeActivityPanel
            collectionSlug={collection.slug}
            initialEvents={activity.events}
            initialSource={activity.source}
            fallbackListings={listings}
            syntheticActivity={syntheticActivity}
            compact
          />
        </div>
      }
    >
      <CollectionStatsRibbon
        stats={stats}
        collectionName={collection.name}
        tensorRibbon={tensorRibbon}
        venuesCount={venuesCount}
      />

      <DeskCrossLinks aggregateDesk={aggregateDesk} />

      <nav
        ref={collectionTabsRef}
        className="mb-3 flex gap-1 overflow-x-auto border-b border-[#333] [scrollbar-width:thin]"
        role="tablist"
        aria-label="Collection views"
      >
        {COLLECTION_TABS.map((tab) => {
          const label =
            tab.id === "items" && panelMode === "sell" ? "INVENTORY" : tab.label;
          const selected = activeTab === tab.id;

          return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            data-collection-tab={tab.id}
            tabIndex={selected ? 0 : -1}
            aria-selected={selected}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => handleCollectionTabKeyDown(event, tab.id)}
            className={cn(
              "trade-collection-tab shrink-0 border-b-2 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
              selected
                ? "border-[var(--tensor-accent)] text-[var(--tensor-white)]"
                : "border-transparent text-[var(--trade-muted)] hover:text-[var(--tensor-white)]",
            )}
          >
            {label}
            {tab.soon ? (
              <span className="ml-1.5 text-[9px] font-normal normal-case text-[var(--trade-muted)]">
                Soon
              </span>
            ) : null}
          </button>
          );
        })}
      </nav>

      {statusBanner}

      {activeTab === "items" ? (
        panelMode === "sell" ? (
          <>
            {!connected ? (
              <EmptyState
                title="Connect your wallet"
                description="Connect wallet to view your inventory and list NFTs from this collection."
              >
                <WalletButton />
              </EmptyState>
            ) : (
              <EmptyState
                title="Inventory not indexed"
                description="Wallet holdings for this collection will appear here when portfolio sync is enabled."
              />
            )}
            <TradePortfolioEmptyGrid skeleton className="mt-4" />
          </>
        ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <TradeFilterDrawer
              listings={listings}
              availableGrades={availableGrades}
              filters={filters}
              onFiltersChange={setFilters}
              resultCount={filteredListings.length}
              aggregateDesk={aggregateDesk}
            />
            <TradeDeskToolbar
              sort={sort}
              onSortChange={setSort}
              resultCount={filteredListings.length}
              totalCount={listings.length}
              searchQuery={filters.searchQuery}
              onSearchChange={(searchQuery) =>
                setFilters((current) => ({ ...current, searchQuery }))
              }
              gridDensity={gridDensity}
              onDensityChange={setGridDensity}
              onRefresh={() => setRefreshKey((k) => k + 1)}
              aggregateDesk={aggregateDesk}
              className="mb-0 flex-1"
            />
          </div>

          {listings.length === 0 ? (
            <EmptyState
              title="No listings yet"
              description={resolveEmptyListingsDescription({
                aggregateDesk,
                depth,
                partnerMeta,
              })}
            />
          ) : (
            <>
              {filteredListings.length === 0 ? (
                <EmptyState
                  title="No matches"
                  description="Adjust filters to see more listings."
                >
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setFilters(DEFAULT_TRADE_FILTERS)}
                  >
                    Reset filters
                  </Button>
                </EmptyState>
              ) : null}
              {filteredListings.length > 0 || sellNowSol != null ? (
                <>
                  <TradeListingGrid
                    key={refreshKey}
                    listings={filteredListings}
                    collectionSlug={collection.slug}
                    gridDensity={gridDensity}
                    floorSol={sellNowSol}
                    onInstantSell={
                      sellNowSol != null
                        ? () => setInstantSellOpen(true)
                        : undefined
                    }
                    onAllBids={() => setActiveTab("collection_bid")}
                    className={filteredListings.length === 0 ? "mt-4" : undefined}
                  />
                  {sellNowSol != null ? (
                    <TradeInstantSellModal
                      open={instantSellOpen}
                      onClose={() => setInstantSellOpen(false)}
                      floorSol={sellNowSol}
                      collectionName={collection.name}
                    />
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </>
        )
      ) : activeTab === "info" ? (
        <CollectionInfoPanel
          collection={collection}
          aggregateDesk={aggregateDesk}
          listings={listings}
        />
      ) : activeTab === "activity" ? (
        <TradeActivityPanel
          collectionSlug={collection.slug}
          initialEvents={activity.events}
          initialSource={activity.source}
          fallbackListings={listings}
          syntheticActivity={syntheticActivity}
        />
      ) : activeTab === "orders" ? (
        <CollectionOrdersPanel collectionSlug={collection.slug} />
      ) : activeTab === "traits" ? (
        <CollectionTraitsPanel listings={filteredListings} />
      ) : activeTab === "holders" ? (
        <CollectionHoldersPanel collectionSlug={collection.slug} />
      ) : activeTab === "bids" || activeTab === "collection_bid" ? (
        <CollectionBidsPanel
          collectionSlug={collection.slug}
          className="trade-collection-bids-tab"
        />
      ) : null}
    </TradeDeskShell>
  );
}

function renderStatusBanner({
  aggregateDesk,
  partnerMeta,
  depth,
  fromFallback,
  dbStatus,
  dbHint,
}: {
  aggregateDesk?: boolean;
  partnerMeta?: TradeCollectionPartnerMeta;
  depth?: TradeCollectionDepth;
  fromFallback: boolean;
  dbStatus: MarketplaceListResult["dbStatus"];
  dbHint?: string;
}) {
  if (aggregateDesk) {
    return (
      <p
        className="mb-3 rounded-md border border-[#333] bg-[var(--trade-surface)] px-3 py-2 text-xs text-[var(--trade-muted)]"
        role="status"
      >
        Aggregate desk — listings merged across partner venues. Venue badges show source
        on each row; use Buy on partner ↗ when on-site TCM fill is unavailable.
      </p>
    );
  }

  if (partnerMeta) {
    const sourceLabel =
      partnerMeta.sources.length > 0
        ? partnerMeta.sources.join(", ")
        : "external seed";
    const fallbackNote =
      partnerMeta.fromFallback
        ? " Ingest is using fallback seed data — run npm run sync:discover for live rows."
        : "";
    return (
      <p
        className="mb-3 rounded-md border border-[#333] bg-[var(--trade-surface)] px-3 py-2 text-xs text-[var(--trade-muted)]"
        role="status"
      >
        Partner listings — sourced from {sourceLabel}.{fallbackNote} Buy on partner opens a deep
        link; on-site TCM fill ships when you own the NFT.
      </p>
    );
  }

  if (depth?.readConfigured && depth.source === "tensor_api" && !depth.error) {
    return (
      <p
        className="mb-3 rounded-md border border-[#333] bg-[var(--trade-surface)] px-3 py-2 text-xs text-[var(--trade-muted)]"
        role="status"
      >
        Live read-only depth from Tensor index
        {depth.tensorSlug ? (
          <>
            {" "}
            (<span className="font-mono text-[var(--tensor-white)]">{depth.tensorSlug}</span>)
          </>
        ) : null}
        .
      </p>
    );
  }

  if (depth?.error) {
    return (
      <p
        className="mb-3 rounded-md border border-[#555] bg-[var(--trade-panel)] px-3 py-2 text-xs text-[var(--trade-muted)]"
        role="status"
      >
        Tensor read: {depth.error}
      </p>
    );
  }

  if (fromFallback && dbStatus === "unconfigured") {
    return (
      <p
        className="mb-3 rounded-md border border-[#333] bg-[var(--trade-surface)] px-3 py-2 text-xs text-[var(--trade-muted)]"
        role="status"
      >
        Demo mode — listings from <code className="text-[var(--tensor-white)]">data/slabs.json</code>
      </p>
    );
  }

  if (fromFallback && dbStatus === "unreachable") {
    return (
      <p
        className="mb-3 rounded-md border border-[#555] bg-[var(--trade-panel)] px-3 py-2 text-xs text-[var(--trade-muted)]"
        role="status"
      >
        Database unreachable — {dbHint ?? "JSON fallback active."}
      </p>
    );
  }

  return null;
}

/** Server-side helper to build desk props from vault treasury slabs. */
export function buildTreasuryDeskProps(
  collection: TradeCollectionConfig,
  collections: TradeLandingCollectionPreview[],
  listResult: MarketplaceListResult,
) {
  const listings = mapSlabsToTradeListings(listingsFromResult(listResult), collection.slug);
  const stats = computeTradeCollectionStats(listings);
  return { collection, collections, listings, stats, listResult };
}

function listingsFromResult(listResult: MarketplaceListResult) {
  return listResult.slabs;
}
