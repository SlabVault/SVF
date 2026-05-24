import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { TRADE_ROUTES } from "@/lib/trade-routes";
import {
  filterVisibleCollectionBids,
  resolveTensorCollectionBidTraits,
  type CollectionBidRow,
} from "@/lib/trade/collection-bids";
import { parseCertPrefixQuery } from "@/lib/trade/parse-cert-prefix-query";
import { extractCertNumber } from "@/lib/trade/resolve-listing";
import type { TradeListing } from "@/lib/trade-listings";

const ROOT = process.cwd();

function read(relPath: string) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

test("TRADE_ROUTES exposes canonical slab item path", () => {
  assert.equal(TRADE_ROUTES.slab("abc123mint"), "/trade/slab/abc123mint");
  assert.equal(TRADE_ROUTES.slab("#12345678"), "/trade/slab/12345678");
  assert.equal(TRADE_ROUTES.collection("collector-crypt"), "/trade/c/collector-crypt");
});

test("P0 trade desk components exist", () => {
  assert.match(read("components/trade/trade-desk-shell.tsx"), /TradeDeskShell/);
  assert.match(read("components/trade/tensor/collection-desk-layout.tsx"), /TensorCollectionDeskLayout/);
  assert.match(read("components/trade/tensor/nft-card.tsx"), /TensorNftCard/);
  assert.match(read("components/trade/tensor/stats-grid.tsx"), /TensorStatsGrid/);
  assert.match(read("components/trade/collection-stats-ribbon.tsx"), /CollectionStatsRibbon/);
  assert.match(read("components/trade/trade-listing-grid.tsx"), /TradeListingGrid/);
  assert.match(read("components/trade/trade-listing-tile.tsx"), /TradeListingTile/);
  assert.match(read("components/trade/trade-filter-drawer.tsx"), /TradeFilterDrawer/);
  assert.match(read("components/trade/trade-partner-collection-desk.tsx"), /TradePartnerCollectionDesk/);
  assert.match(read("app/trade/slab/[certOrMint]/page.tsx"), /resolveTradeListing/);
  assert.match(read("app/api/trade/collections/[slug]/depth/route.ts"), /getTradeCollectionDepth/);
  assert.match(
    read("app/api/trade/partners/[platform]/listings/route.ts"),
    /fetchPartnerIngestListingsForPlatform/,
  );
  assert.match(
    read("app/api/trade/partners/[platform]/stats/route.ts"),
    /fetchPartnerIngestStatsForPlatform/,
  );
  assert.match(read("components/trade/trade-partner-collection-desk.tsx"), /syntheticActivity=\{activity\.source === "synthetic"\}/);
});

test("partner collection page loads listings via listPartnerTradeListings", () => {
  const source = read("app/trade/c/[slug]/page.tsx");
  const partnerDesk = read("components/trade/trade-partner-collection-desk.tsx");
  assert.match(source, /listPartnerTradeListings/);
  assert.match(source, /TradePartnerCollectionDesk/);
  assert.doesNotMatch(source, /collectionDepth/);

  const partnerBranch = source.slice(
    source.indexOf("isPartnerIngestSupported"),
    source.indexOf("slabvault-treasury"),
  );
  assert.doesNotMatch(partnerBranch, /listMarketplaceSlabs/);
  assert.match(partnerBranch, /isPartnerIngestSupported\(collection\.partner\)/);
  assert.match(
    partnerBranch,
    /fetchTensorRibbonMetricsForCollection\(collection\.slug\)/,
  );
  assert.match(partnerBranch, /getTradeCollectionActivity/);
  assert.match(partnerBranch, /loadTradeLandingNavCollections/);
  assert.match(partnerBranch, /tensorRibbon=\{tensorRibbon\}/);
  assert.match(partnerDesk, /tensorRibbon=\{tensorRibbon\}/);
  assert.match(partnerDesk, /TradeCollectionDeskClient/);
});

test("TradeDeskHeader: no duplicate search — wallet and ⌘K live in TradeAppHeader only", () => {
  const deskHeader = read("components/trade/trade-desk-header.tsx");
  const appHeader = read("components/trade/trade-app-header.tsx");
  assert.doesNotMatch(deskHeader, /Search certs \(⌘K\)/);
  assert.doesNotMatch(deskHeader, /TradeCommandPalette/);
  assert.match(appHeader, /TradeCommandPalette/);
  assert.match(appHeader, /Search collections/);
  assert.match(appHeader, /cert compare Soon/);
  assert.match(deskHeader, /kind="experimental"/);
  assert.doesNotMatch(deskHeader, /WalletButton/);
  assert.match(appHeader, /WalletButton/);
  assert.doesNotMatch(deskHeader, /VaultSubNav|Shop|Purchases/);
});

test("TradeDeskHeader collection desk row: icon, name, verified crown, VenueBadge", () => {
  const deskHeader = read("components/trade/trade-desk-header.tsx");
  assert.match(deskHeader, /trade-collection-header/);
  assert.match(deskHeader, /trade-collection-header__icon/);
  assert.match(deskHeader, /trade-collection-header__verified/);
  assert.match(deskHeader, /activeCollection\.name/);
  assert.match(deskHeader, /activeCollection\.imageUrl/);
  assert.match(deskHeader, /activeCollection\.verified/);
  assert.match(deskHeader, /<VenueBadge[\s\S]*partner=\{activeCollection\.partner\}/);
  assert.doesNotMatch(deskHeader, /VenueBadge[\s\S]*hidden sm:inline-flex/);
});

test("extractCertNumber prefers cert in listing name", () => {
  const listing = {
    id: "mint123",
    name: "Charizard PSA 10 #12345678",
    grade: "PSA 10",
    askSol: 1,
    collectionId: "collector-crypt",
  } as TradeListing;

  assert.equal(extractCertNumber(listing), "12345678");
});

test("legacy /trade/item redirects to /trade/slab", () => {
  const source = read("app/trade/item/[mint]/page.tsx");
  assert.match(source, /redirect\(/);
  assert.match(source, /TRADE_ROUTES\.slab/);
});

test("trade-shell duplicate removed", () => {
  assert.throws(() => read("components/trade/trade-shell.tsx"));
});

test("tensor template port maps partner listings", () => {
  const mapper = read("components/trade/tensor/map-listing.ts");
  assert.match(mapper, /mapTradeListingToTensorNft/);
  assert.match(mapper, /tradeListingHasOnChainBuyMetadata/);
  assert.match(mapper, /sellerWallet/);
  assert.match(mapper, /listState/);
  assert.match(read("components/trade/tensor/types.ts"), /TensorNft/);
});

test("P0 nft-card gates grid Buy without seller/listState", () => {
  const card = read("components/trade/tensor/nft-card.tsx");
  const mapper = read("components/trade/tensor/map-listing.ts");
  assert.match(card, /resolveOnChainBuyBlockReason/);
  assert.match(card, /showPartnerBuyLink/);
  assert.match(card, /tradeListingShowsPartnerBuyLink/);
  assert.match(
    mapper,
    /Listing missing seller wallet or list state for on-chain buy\./,
  );
  assert.match(card, /disabled=\{buyDisabled\}/);
  assert.match(card, /title=\{buyTitle\}/);
});

test("M0 registry: beezie + courtyard preview collections with chain field", () => {
  const source = read("lib/onchain/collections.ts");
  assert.match(source, /"beezie"/);
  assert.match(source, /"courtyard"/);
  assert.match(source, /chain: "base"/);
  assert.match(source, /chain: "polygon"/);
  assert.match(source, /status: "preview"/);
});

test("M0 partner ingest adapter contract exports", () => {
  const source = read("lib/partner-ingest-adapter.ts");
  assert.match(source, /export type PartnerIngestAdapter/);
  assert.match(source, /settlementMode: PartnerSettlementMode/);
  assert.match(source, /chain: TradeChainId/);
});

test("M2 pro desk: left trade panel, collection tabs, stats ribbon props", () => {
  const desk = read("components/trade/trade-collection-desk-client.tsx");
  const layout = read("components/trade/tensor/collection-desk-layout.tsx");
  const panel = read("components/trade/tensor/trade-panel.tsx");

  assert.match(desk, /tradePanel=\{[\s\S]*<TensorTradePanel/);
  assert.match(desk, /label: "ITEMS"/);
  assert.match(desk, /label: "INFO"/);
  assert.match(desk, /label: "ACTIVITY"/);
  assert.match(desk, /label: "BIDS"/);
  assert.match(desk, /label: "ORDERS"/);
  assert.match(desk, /label: "TRAITS"/);
  assert.match(desk, /label: "HODLERS"/);
  assert.match(desk, /label: "COLLECTION BID"/);
  assert.match(desk, /CollectionOrdersPanel/);
  assert.match(desk, /CollectionTraitsPanel/);
  assert.match(desk, /CollectionHoldersPanel/);
  assert.match(desk, /useTradeDeskFilters/);
  assert.match(read("components/trade/use-trade-desk-filters.ts"), /replaceState/);
  assert.match(desk, /tensorRibbon=\{tensorRibbon\}/);
  assert.match(read("components/trade/tensor/stats-grid.tsx"), /resolveStatsRibbonDisplay/);
  assert.match(layout, /tradePanel\?: ReactNode/);
  assert.match(layout, /w-\[12\.5rem\]/);
  assert.match(layout, /xl:w-\[17\.5rem\]/);
  assert.match(read("components/trade/trade-activity-panel.tsx"), /xl:w-\[17\.5rem\]/);
  assert.match(panel, /flex-col/);
});

test("M2 collection desk filter URL sync helpers", () => {
  const urlHelpers = read("lib/trade/trade-filter-url.ts");
  assert.match(urlHelpers, /parseTradeFiltersFromSearchParams/);
  assert.match(urlHelpers, /buildTradeFilterSearchParams/);
  assert.match(urlHelpers, /params\.get\("grader"\)/);
  assert.match(urlHelpers, /params\.get\("grade"\)/);
  assert.match(urlHelpers, /params\.get\("min"\)/);
  assert.match(urlHelpers, /params\.get\("q"\)/);
  assert.match(urlHelpers, /params\.get\("set"\)/);
});

test("M2 global search stub: app header opens command palette on Cmd+K", () => {
  const appHeader = read("components/trade/trade-app-header.tsx");
  const palette = read("components/trade/trade-command-palette.tsx");
  assert.match(appHeader, /TradeCommandPalette/);
  assert.match(appHeader, /nav_vault_from_trade/);
  assert.match(appHeader, /nav_home_from_trade/);
  assert.match(appHeader, /nav_all_listings/);
  assert.match(appHeader, /All listings/);
  assert.match(appHeader, /cert compare Soon/);
  assert.match(appHeader, /⌘K/);
  assert.match(appHeader, /metaKey \|\| event\.ctrlKey/);
  assert.match(palette, /SLABVAULT_TRADE_COLLECTIONS/);
  assert.match(palette, /TRADE_ROUTES\.collection/);
  assert.match(palette, /TRADE_ROUTES\.all/);
  assert.match(palette, /VENUE_LABELS/);
  assert.match(palette, /multi-venue compare Soon/);
  assert.match(palette, /compare Soon/);
});

test("M2 collection nav dense sidebar rows", () => {
  const nav = read("components/trade/trade-collection-nav.tsx");
  assert.match(nav, /VenueBadge/);
  assert.match(nav, /size-5/);
  assert.match(nav, /font-mono text-\[10px\]/);
  assert.match(nav, /trade-collection-nav/);
});

test("M2 landing index table hides empty Tensor metric columns", () => {
  const layout = read("components/trade/tensor/collection-desk-layout.tsx");
  assert.match(layout, /trade-index-table/);
  assert.match(layout, /metrics\.listedPct/);
  assert.match(layout, /metrics\.volume24h/);
  assert.match(layout, /metrics\.priceChange24h/);
});

test("M2 activity feed tensor row styling", () => {
  const feed = read("components/trade-activity-feed.tsx");
  const panel = read("components/trade/trade-activity-panel.tsx");
  assert.match(feed, /trade-activity-feed/);
  assert.match(feed, /LIST/);
  assert.match(feed, /BUY/);
  assert.match(feed, /trade-activity-label--buy/);
  assert.match(feed, /trade-activity-label--list/);
  assert.match(feed, /trade-activity-row/);
  assert.match(feed, /import Link from "next\/link"/);
  assert.match(feed, /buildTradeItemHref/);
  assert.match(feed, /buildActivityItemHref/);
  assert.match(feed, /collectionSlug\?: string/);
  assert.match(feed, /event\.slabId && collectionSlug/);
  assert.match(feed, /<Link[\s\S]*href=\{itemHref\}/);
  assert.match(panel, /collectionSlug=\{collectionSlug\}/);
});

test("M2 grid toolbar: search, density, refresh + sort dropdown", () => {
  const toolbar = read("components/trade/trade-desk-toolbar.tsx");
  const desk = read("components/trade/trade-collection-desk-client.tsx");
  assert.match(toolbar, /Search NFTs by name or grade/);
  assert.match(toolbar, /Grid density/);
  assert.match(toolbar, /label: "s"/);
  assert.match(toolbar, /label: "m"/);
  assert.match(toolbar, /label: "l"/);
  assert.match(toolbar, /value: "s"/);
  assert.match(toolbar, /value: "m"/);
  assert.match(toolbar, /value: "l"/);
  assert.match(toolbar, /aria-pressed=\{gridDensity === option\.value\}/);
  assert.match(toolbar, /Refresh/);
  assert.match(toolbar, /Price \(low to high\)/);
  assert.match(toolbar, /Recently listed/);
  assert.match(toolbar, /<select/);
  assert.match(desk, /searchQuery=\{filters\.searchQuery\}/);
  assert.match(desk, /onSearchChange=\{\(searchQuery\)/);
  assert.match(desk, /gridDensity=\{gridDensity\}/);
  assert.match(desk, /onRefresh=\{\(\) => setRefreshKey/);
});

test("M2 filter accordion with trait counts", () => {
  const filters = read("components/trade/trade-trait-filters.tsx");
  assert.match(filters, /FilterAccordionSection/);
  assert.match(filters, /gradeCounts\.get\(grade\)/);
  assert.match(filters, /graderCounts\.get\(grader\)/);
  assert.match(filters, /setNameCounts\.get\(setName\)/);
  assert.match(filters, /filters\.setQuery/);
  assert.match(filters, /toggleGrader/);
  assert.match(filters, /onChange=\{\(\) => toggleGrader\(grader\)\}/);
  assert.match(filters, /Set names appear when listings include set metadata/);
});

test("M2 VenueBadge on nft-card tiles", () => {
  const card = read("components/trade/tensor/nft-card.tsx");
  assert.match(card, /resolveListingVenuePartner\(listing, collectionSlug\)/);
  assert.match(card, /VenueBadge partner=\{venuePartner\}/);
  assert.match(read("components/trade/venue-badge.tsx"), /collector_crypt: "CC"/);
  assert.match(read("components/trade/venue-badge.tsx"), /slabvault_treasury: "Treasury"/);
  assert.match(read("components/trade/venue-badge.tsx"), /magic_eden: "ME"/);
});

test("P4 grid tile: partner deep link CTA when on-chain buy unavailable", () => {
  const card = read("components/trade/tensor/nft-card.tsx");
  assert.match(card, /canBuyOnChain\(nft, listing, collectionSlug\)/);
  assert.match(card, /resolveTradeListingPartnerCheckoutUrl\(listing, collectionSlug\)/);
  assert.match(card, /tradeListingShowsPartnerBuyLink\(listing, collectionSlug\)/);
  assert.match(card, /!onChainBuy[\s\S]*Boolean\(partnerCheckoutUrl\)/);
  assert.match(
    card,
    /showPartnerBuyLink && partnerCheckoutUrl[\s\S]*tensor-btn-primary[\s\S]*Buy ↗/,
  );
  assert.match(card, /cta_trade_partner_deep_link/);
  assert.match(card, /trade_buy_partner:\$\{listing\.id\}/);
});

test("M2 nft-card rank badge tensor density", () => {
  const card = read("components/trade/tensor/nft-card.tsx");
  const css = read("app/globals.css");
  assert.match(card, /#\{rank\}/);
  assert.match(card, /justify-between/);
  assert.match(card, /trade-rank-badge--rank/);
  assert.match(card, /p-1/);
  assert.match(css, /\.trade-rank-badge--rank/);
  assert.match(css, /font-size: 8px/);
});

test("M2 instant sell first grid cell", () => {
  const grid = read("components/trade/trade-listing-grid.tsx");
  const tile = read("components/trade/trade-instant-sell-tile.tsx");
  const desk = read("components/trade/trade-collection-desk-client.tsx");

  assert.match(grid, /TradeInstantSellTile/);
  assert.ok(grid.indexOf("TradeInstantSellTile") < grid.indexOf("listings.map("));
  assert.match(tile, /Instant sell/);
  assert.match(tile, /SELL NOW/);
  assert.match(tile, /ALL BIDS/);
  assert.match(desk, /floorSol=\{sellNowSol\}/);
  assert.match(desk, /onInstantSell=/);
});

test("M2 stats ribbon: buy/sell tint + 7 metric cells", () => {
  const stats = read("components/trade/tensor/stats-grid.tsx");
  const css = read("app/globals.css");
  assert.match(stats, /trade-stat-cell--buy/);
  assert.match(stats, /trade-stat-cell--sell/);
  assert.match(stats, /24H SALES/);
  assert.match(stats, /24H PRICE Δ/);
  assert.match(stats, /VOLUME \(ALL\)/);
  assert.match(stats, /resolveStatsRibbonDisplay\(stats, tensorRibbon\)/);
  assert.match(css, /trade-stat-cell--buy/);
  assert.match(css, /trade-stat-cell--sell/);
});

test("M2 sweep panel: slider + count/sol toggle + green CTA", () => {
  const panel = read("components/trade/tensor/trade-panel.tsx");
  const css = read("app/globals.css");
  assert.match(panel, /type="range"/);
  assert.match(panel, /trade-sweep-slider/);
  assert.match(panel, /SweepUnit/);
  assert.match(panel, /tensor-btn-sweep/);
  assert.match(css, /tensor-btn-sweep/);
  assert.match(panel, /SOL budget sweep[\s\S]*Soon/);
  assert.doesNotMatch(panel, /fills floor listings up to budget/);
});

test("M2 sell panel: LIST/SELL/DELIST sub-tabs + maker fee stub", () => {
  const panel = read("components/trade/tensor/trade-panel.tsx");
  const desk = read("components/trade/trade-collection-desk-client.tsx");

  assert.match(panel, /type SellTab = "list" \| "sell" \| "delist"/);
  assert.match(panel, /label: "LIST"/);
  assert.match(panel, /label: "SELL"/);
  assert.match(panel, /label: "DELIST"/);
  assert.match(panel, /NFTs to list/);
  assert.match(panel, /Maker fee:/);
  assert.match(panel, /FREE/);
  assert.match(panel, /Connect wallet to manage listings/);
  assert.match(panel, /onModeChange\?: \(mode: "buy" \| "sell"\)/);
  assert.match(panel, /ListForSaleModal/);

  assert.match(desk, /onModeChange=\{handlePanelModeChange\}/);
  assert.match(desk, /panelMode === "sell" \? "INVENTORY"/);
  assert.match(desk, /TradePortfolioEmptyGrid/);
  assert.match(desk, /Connect wallet to view your inventory/);
});

test("TradeListing type includes settlementMode and chain", () => {
  const source = read("lib/trade-listings.ts");
  assert.match(source, /settlementMode\?: TradeSettlementMode/);
  assert.match(source, /chain\?: TradeChainId/);
});

test("P0 collection desk TRAITS tab: trait distribution from filtered listings", () => {
  const desk = read("components/trade/trade-collection-desk-client.tsx");
  const traitsPanel = read("components/trade/collection-traits-panel.tsx");

  assert.match(desk, /\{ id: "traits", label: "TRAITS" \}/);
  assert.doesNotMatch(desk, /\{ id: "traits", label: "TRAITS", soon: true \}/);
  assert.match(desk, /activeTab === "traits"[\s\S]*<CollectionTraitsPanel listings=\{filteredListings\} \/>/);
  assert.match(traitsPanel, /aggregateGraderCounts/);
  assert.match(traitsPanel, /aggregateGradeCounts/);
  assert.match(traitsPanel, /aggregateSetCounts/);
});

test("P0 collection desk BIDS tab: hide trait bids filter", () => {
  const bids: CollectionBidRow[] = [
    {
      bidStateAddress: "bid-all",
      priceSol: 1,
      quantity: 1,
      bidderWallet: null,
      blockTime: null,
      traitsSummary: "ALL",
    },
    {
      bidStateAddress: "bid-trait-summary",
      priceSol: 2,
      quantity: 1,
      bidderWallet: null,
      blockTime: null,
      traitsSummary: "Background: Blue",
    },
    {
      bidStateAddress: "bid-trait-flag",
      priceSol: 3,
      quantity: 1,
      bidderWallet: null,
      blockTime: null,
      isTraitBid: true,
    },
  ];

  assert.equal(filterVisibleCollectionBids(bids, false).length, 3);
  const filtered = filterVisibleCollectionBids(bids, true);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.bidStateAddress, "bid-all");

  const panel = read("components/trade/collection-bids-panel.tsx");
  assert.match(panel, /Hide trait bids/);
  assert.match(panel, /filterVisibleCollectionBids/);

  assert.deepEqual(resolveTensorCollectionBidTraits({}), {
    traitsSummary: "ALL",
    isTraitBid: false,
  });
  assert.deepEqual(
    resolveTensorCollectionBidTraits({
      traits: { Background: "Blue" },
    }),
    { traitsSummary: "Background: Blue", isTraitBid: true },
  );
  assert.deepEqual(
    resolveTensorCollectionBidTraits({
      bidType: "trait_bid",
      traits: [{ trait_type: "Eyes", value: "Laser" }],
    }),
    { isTraitBid: true, traitsSummary: "Eyes: Laser" },
  );
});

test("P0 collection desk ORDERS tab: wallet-gated orders table shell", () => {
  const desk = read("components/trade/trade-collection-desk-client.tsx");
  const ordersPanel = read("components/trade/collection-orders-panel.tsx");

  assert.match(desk, /import \{ CollectionOrdersPanel \}/);
  assert.match(desk, /import \{ CollectionTraitsPanel \}/);
  assert.match(desk, /import \{ CollectionHoldersPanel \}/);
  assert.doesNotMatch(desk, /CollectionTabSoon/);
  assert.match(desk, /\{ id: "orders", label: "ORDERS" \}/);
  assert.doesNotMatch(desk, /\{ id: "orders", label: "ORDERS", soon: true \}/);
  assert.match(
    desk,
    /activeTab === "orders"[\s\S]*<CollectionOrdersPanel collectionSlug=\{collection\.slug\} \/>/,
  );
  assert.match(ordersPanel, /Connect wallet to view your orders/);
  assert.match(ordersPanel, /placeholder rows are shown/);
});

test("P0 collection desk HODLERS tab: wallet-gated holder distribution shell", () => {
  const desk = read("components/trade/trade-collection-desk-client.tsx");
  const holdersPanel = read("components/trade/collection-holders-panel.tsx");

  assert.match(desk, /\{ id: "holders", label: "HODLERS" \}/);
  assert.doesNotMatch(desk, /\{ id: "holders", label: "HODLERS", soon: true \}/);
  assert.match(
    desk,
    /activeTab === "holders"[\s\S]*<CollectionHoldersPanel collectionSlug=\{collection\.slug\} \/>/,
  );
  assert.match(holdersPanel, /Connect wallet to view holder distribution/);
  assert.match(holdersPanel, /No placeholder holder rows/);
});

test("M2 collection desk empty listings: honest partner ingest copy", () => {
  const desk = read("components/trade/trade-collection-desk-client.tsx");
  assert.match(desk, /resolveEmptyListingsDescription/);
  assert.match(desk, /No listings yet/);
  assert.match(desk, /Partner ingest seed has no rows/);
  assert.match(desk, /Ingest is using fallback seed data/);
  assert.match(read("components/trade-activity-feed.tsx"), /No recent partner ingest events/);
});

test("P3 sweep panel: on-chain only on aggregate and partner desks", () => {
  const panel = read("components/trade/tensor/trade-panel.tsx");
  const desk = read("components/trade/trade-collection-desk-client.tsx");

  assert.match(panel, /aggregateDesk\?: boolean/);
  assert.match(desk, /aggregateDesk=\{aggregateDesk\}/);
  assert.match(
    desk,
    /tradePanel=\{[\s\S]*<TensorTradePanel[\s\S]*aggregateDesk=\{aggregateDesk\}/,
  );
  assert.match(panel, /tradeListingHasOnChainBuyMetadata/);
  assert.match(panel, /resolvesOnChainSettlement/);
  assert.match(panel, /sweepEligibleListings/);
  assert.match(panel, /hasPartnerCheckoutRows/);
  assert.match(panel, /hasMissingSellerEnrichmentRows/);
  assert.match(panel, /showPartnerSweepHint/);
  assert.match(panel, /showSellerEnrichmentSweepHint/);
  assert.match(panel, /Sweep is on-chain only/);
  assert.match(panel, /Buy on partner ↗ on grid tiles/);
  assert.match(
    panel,
    /On-chain rows missing Tensor seller enrichment \(seller wallet or list state\) are excluded from sweep\./,
  );
  assert.doesNotMatch(panel, /sweep uses on-site TCM fill when you own listings/);
});
