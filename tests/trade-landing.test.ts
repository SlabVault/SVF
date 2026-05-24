/**
 * Trade landing desk/layout and source-wiring tests.
 * UI layout assertions (newMints:) are owned by the UI lane.
 * Lib data tests: trade-landing-data.test.ts.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import {
  applyLandingIndexOrder,
  computeLandingCollectionSpreadPct,
  filterLandingIndexRowsByCollection,
} from "@/components/trade/trade-landing-desk-client";
import type { TradeLandingCollectionPreview } from "@/lib/trade-landing";
import {
  mapPreviewToIndexRow,
  sortIndexRows,
  type TensorCollectionIndexRow,
} from "@/components/trade/tensor/collection-desk-layout";
import type { MarketplaceSlab } from "@/lib/marketplace-slabs";
import {
  enrichTradeLandingCollectionsWithTensor,
  getTradeLandingAggregateFromCollections,
  getTradeLandingCollections,
  getTradeLandingDeskListings,
  getTradeLandingStats,
  getTradeLandingTreasuryStats,
  loadTradeLandingPartnerPreviews,
  loadTradeLandingNavCollections,
  type TradeLandingCollectionPreview,
  TRADE_LIQUIDITY_VENUES,
} from "@/lib/trade-landing";

const ROOT = process.cwd();

function read(relPath: string) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

const sampleSlabs: MarketplaceSlab[] = [
  {
    id: "alpha",
    name: "Charizard",
    grade: "PSA 10",
    estimatedValueUsd: 500,
    acquiredAt: "2026-01-10",
    imageUrl: "/a.jpg",
    vaultedUrl: "https://vaulted.example/a",
    collectrUrl: null,
    status: "AVAILABLE",
    solPrice: 2.5,
    svfPrice: 50000,
  },
];

test("getTradeLandingCollections includes CC, Phygitals, and Magic Eden previews", () => {
  const collections = getTradeLandingCollections({ floorSol: 2.5, listedCount: 1 });
  const slugs = collections.map((c) => c.slug);

  assert.ok(slugs.includes("collector-crypt"));
  assert.ok(slugs.includes("phygitals"));
  assert.ok(slugs.includes("magic-eden"));
  assert.ok(slugs.includes("slabvault-treasury"));
  assert.ok(slugs.includes("beezie"));
  assert.ok(slugs.includes("courtyard"));
  assert.equal(slugs.length, 6);
  assert.equal(collections.every((c) => c.href.startsWith("/trade/c/")), true);
});

test("getTradeLandingStats reflects partner ingest seed health", () => {
  const stats = getTradeLandingStats();

  assert.equal(stats.venueCount, TRADE_LIQUIDITY_VENUES.length);
  assert.ok(stats.collectionCount >= 6);
  assert.equal(typeof stats.listingDataLabel, "string");
  assert.equal(stats.listingDataReady, true);
});

test("getTradeLandingDeskListings maps vault treasury asks from slabs", () => {
  const listings = getTradeLandingDeskListings(sampleSlabs);

  assert.equal(listings.length, 1);
  assert.equal(listings[0]?.collectionId, "slabvault-treasury");
  assert.equal(listings[0]?.askSol, 2.5);
});

test("getTradeLandingTreasuryStats derives floor from live slabs", () => {
  const stats = getTradeLandingTreasuryStats(sampleSlabs);

  assert.equal(stats.listedCount, 1);
  assert.equal(stats.floorSol, 2.5);
});

test("getTradeLandingCollections marks treasury unavailable without stats", () => {
  const collections = getTradeLandingCollections(undefined, {
    treasuryUnavailable: true,
  });
  const treasury = collections.find((c) => c.slug === "slabvault-treasury");

  assert.ok(treasury);
  assert.equal(treasury?.listedCount, null);
  assert.equal(treasury?.floorSol, null);
  assert.match(treasury?.description ?? "", /unavailable/i);
});

test("getTradeLandingCollections uses live partner previews for floor and count", () => {
  const collections = getTradeLandingCollections(undefined, {
    partnerPreviews: [
      {
        slug: "collector-crypt",
        partner: "collector_crypt",
        floorSol: 1.25,
        listedCount: 42,
        fromFallback: false,
      },
      {
        slug: "phygitals",
        partner: "phygitals",
        floorSol: 0.9,
        listedCount: 18,
        fromFallback: true,
      },
    ],
  });

  const cc = collections.find((c) => c.slug === "collector-crypt");
  const phy = collections.find((c) => c.slug === "phygitals");

  assert.ok(cc);
  assert.equal(cc?.floorSol, "1.25");
  assert.equal(cc?.sellNowSol, "1.25");
  assert.equal(cc?.listedCount, 42);
  assert.equal(cc?.status, "live");

  assert.ok(phy);
  assert.equal(phy?.floorSol, "0.9");
  assert.equal(phy?.sellNowSol, "0.9");
  assert.equal(phy?.listedCount, 18);
  assert.equal(phy?.status, "live");
});

test("loadTradeLandingNavCollections loads partner previews and treasury stats", async () => {
  const { withTemporaryEnv } = await import("./helpers/test-helpers");
  await withTemporaryEnv({ DATABASE_URL: undefined, TENSOR_API_KEY: undefined }, async () => {
    const collections = await loadTradeLandingNavCollections();

    const cc = collections.find((row) => row.slug === "collector-crypt");
    const phy = collections.find((row) => row.slug === "phygitals");

    assert.ok(cc);
    assert.ok(phy);
    assert.ok((cc?.listedCount ?? 0) >= 1);
    assert.ok((phy?.listedCount ?? 0) >= 1);
    assert.ok(cc?.floorSol != null);
    assert.ok(phy?.floorSol != null);
  });
});

test("loadTradeLandingPartnerPreviews loads CC and Phygitals in parallel", async () => {
  const { withTemporaryEnv } = await import("./helpers/test-helpers");
  await withTemporaryEnv({ DATABASE_URL: undefined, TENSOR_API_KEY: undefined }, async () => {
    const context = await loadTradeLandingPartnerPreviews();

    assert.equal(context.previews.length, 2);
    assert.ok(context.previews.some((row) => row.slug === "collector-crypt"));
    assert.ok(context.previews.some((row) => row.slug === "phygitals"));
    assert.ok(context.partnerListings.length >= 2);
    assert.ok(
      context.previews.every(
        (row) => row.listedCount >= 1 && row.floorSol != null && row.floorSol > 0,
      ),
    );
  });
});

test("getTradeLandingStats reflects partner preview ingest health", () => {
  const stats = getTradeLandingStats({
    partnerPreviews: [
      {
        slug: "collector-crypt",
        partner: "collector_crypt",
        floorSol: 1,
        listedCount: 5,
        fromFallback: false,
      },
    ],
  });

  assert.equal(stats.listingDataReady, true);
  assert.equal(stats.listingDataLabel, "Partner ingest active");
});

test("getTradeLandingCollections omits sellNow when treasury has zero listings", () => {
  const collections = getTradeLandingCollections({ floorSol: 2.5, listedCount: 0 });
  const treasury = collections.find((c) => c.slug === "slabvault-treasury");

  assert.equal(treasury?.listedCount, 0);
  assert.equal(treasury?.sellNowSol, null);
});

test("mapPreviewToIndexRow maps sell now, listed %, and 24h Tensor columns", () => {
  const preview: TradeLandingCollectionPreview = {
    slug: "collector-crypt",
    name: "Collector Crypt",
    partner: "collector_crypt",
    tokenStandard: "pnft",
    description: "test",
    floorSol: "2",
    sellNowSol: "1.8",
    listedCount: 40,
    listedPct: 18,
    volume24hSol: "144",
    marketCapSol: "3600",
    priceChange24hPct: -4.2,
    status: "live",
    href: "/trade/c/collector-crypt",
  };

  const row = mapPreviewToIndexRow(preview);

  assert.equal(row.sellNowSol, "1.8");
  assert.equal(row.listedPct, 18);
  assert.equal(row.volume24hSol, "144");
  assert.equal(row.marketCapSol, "3600");
  assert.equal(row.priceChange24hPct, -4.2);
});

test("mapPreviewToIndexRow omits sell now when collection has zero listings", () => {
  const row = mapPreviewToIndexRow({
    slug: "magic-eden",
    name: "Magic Eden",
    partner: "magic_eden",
    tokenStandard: "cnft",
    description: "test",
    floorSol: "5",
    sellNowSol: "5",
    listedCount: 0,
    status: "preview",
    href: "/trade/c/magic-eden",
  });

  assert.equal(row.sellNowSol, null);
});

test("getTradeLandingAggregateFromCollections sums 24h volume across previews", () => {
  const collections: TradeLandingCollectionPreview[] = [
    {
      slug: "a",
      name: "A",
      partner: "collector_crypt",
      tokenStandard: "pnft",
      description: "",
      floorSol: "2",
      listedCount: 10,
      volume24hSol: "10.5",
      status: "live",
      href: "/trade/c/a",
    },
    {
      slug: "b",
      name: "B",
      partner: "phygitals",
      tokenStandard: "cnft",
      description: "",
      floorSol: "1",
      listedCount: 5,
      volume24hSol: "20",
      status: "live",
      href: "/trade/c/b",
    },
  ];

  const aggregate = getTradeLandingAggregateFromCollections(collections);
  assert.equal(aggregate.listedCount, 15);
  assert.equal(aggregate.floorSol, 1);
  assert.equal(aggregate.volume24hSol, 30.5);
});

test("enrichTradeLandingCollectionsWithTensor preserves ingest ribbon without Tensor key", async () => {
  const { withTemporaryEnv } = await import("./helpers/test-helpers");
  const { computeTradeCollectionStats, deriveIngestListedPct } = await import(
    "@/lib/trade-listings"
  );
  const { getPartnerListingSeedCount } = await import("@/lib/partner-listings");
  const {
    enrichTradeLandingCollectionsWithTensor,
    getTradeLandingCollections,
    loadTradeLandingPartnerPreviews,
  } = await import("@/lib/trade-landing");

  await withTemporaryEnv({ DATABASE_URL: undefined, TENSOR_API_KEY: undefined }, async () => {
    const { previews, partnerListings } = await loadTradeLandingPartnerPreviews();
    const ccPreview = previews.find((row) => row.slug === "collector-crypt");
    assert.ok(ccPreview);

    const ccListings = partnerListings.filter(
      (listing) => listing.collectionId === "collector-crypt",
    );
    const expectedRibbon = computeTradeCollectionStats(ccListings);

    const base = getTradeLandingCollections(undefined, { partnerPreviews: previews });
    const enriched = await enrichTradeLandingCollectionsWithTensor(base);
    const cc = enriched.find((c) => c.slug === "collector-crypt");

    assert.equal(
      cc?.volume24hSol,
      expectedRibbon.volume24hSol != null ? String(expectedRibbon.volume24hSol) : null,
    );
    assert.equal(cc?.priceChange24hPct, expectedRibbon.priceChange24hPct ?? null);
    assert.equal(
      cc?.listedPct,
      deriveIngestListedPct(
        ccPreview.listedCount,
        getPartnerListingSeedCount(ccPreview.partner),
      ),
    );
    assert.equal(
      cc?.sellNowSol,
      ccPreview.floorSol != null ? String(ccPreview.floorSol) : null,
    );
  });
});

const indexRowFixture = (
  slug: string,
  volume24hSol: string | null,
): TensorCollectionIndexRow => ({
  slug,
  name: slug,
  href: `/trade/c/${slug}`,
  floorSol: "1",
  sellNowSol: "1",
  listedCount: 1,
  listedPct: null,
  volume24hSol,
  marketCapSol: null,
  priceChange24hPct: null,
  status: "live",
  partner: "collector_crypt",
});

test("sortIndexRows orders by 24h volume with nulls last", () => {
  const rows = [
    indexRowFixture("low", "10"),
    indexRowFixture("high", "100"),
    indexRowFixture("missing", null),
    indexRowFixture("mid", "50"),
  ];

  const desc = sortIndexRows(rows, "volume24h", "desc").map((r) => r.slug);
  assert.deepEqual(desc, ["high", "mid", "low", "missing"]);

  const asc = sortIndexRows(rows, "volume24h", "asc").map((r) => r.slug);
  assert.deepEqual(asc, ["low", "mid", "high", "missing"]);
});

test("filterLandingIndexRowsByCollection matches name or slug case-insensitively", () => {
  const rows = [
    { ...indexRowFixture("collector-crypt", "10"), name: "Collector Crypt" },
    { ...indexRowFixture("phygitals", "5"), name: "Phygitals" },
    { ...indexRowFixture("magic-eden", null), name: "Magic Eden" },
  ];

  assert.deepEqual(
    filterLandingIndexRowsByCollection(rows, "").map((r) => r.slug),
    ["collector-crypt", "phygitals", "magic-eden"],
  );
  assert.deepEqual(
    filterLandingIndexRowsByCollection(rows, "  PHY  ").map((r) => r.slug),
    ["phygitals"],
  );
  assert.deepEqual(
    filterLandingIndexRowsByCollection(rows, "magic-eden").map((r) => r.slug),
    ["magic-eden"],
  );
  assert.deepEqual(
    filterLandingIndexRowsByCollection(rows, "eden").map((r) => r.slug),
    ["magic-eden"],
  );
  assert.deepEqual(filterLandingIndexRowsByCollection(rows, "zzz"), []);
});

test("landing index toolbar exposes Tensor NEW MINTS and 1h chips", () => {
  const toolbar = read("components/trade/trade-landing-index-toolbar.tsx");
  assert.match(toolbar, /NEW MINTS/);
  assert.match(toolbar, /\{ id: "1h", label: "1h" \}/);
  assert.doesNotMatch(toolbar, /30d/);
});

test("landing table toolbar wires FILTERS to collection filter bar", () => {
  const toolbar = read("components/trade/trade-landing-index-toolbar.tsx");
  assert.match(toolbar, /onClick=\{focusCollectionFilter\}/);
  assert.match(toolbar, /scrollIntoView/);
  assert.match(toolbar, /FILTERS/);
  assert.doesNotMatch(toolbar, /FILTERS[\s\S]{0,120}Soon/);
  assert.match(toolbar, /FAVORITES[\s\S]*Soon/);
  assert.match(toolbar, /INVENTORY[\s\S]*Soon/);
  assert.match(toolbar, /TABLE_SOON_ACTIONS/);
});

test("landing desk passes collection filter state to toolbar", () => {
  const landing = read("components/trade/trade-landing-desk-client.tsx");
  assert.match(landing, /collectionFilter=\{collectionFilter\}/);
  assert.match(landing, /onCollectionFilterChange=\{setCollectionFilter\}/);
});

test("trade landing timeframe prefs use 1h not 30d", () => {
  const prefs = read("lib/trade-landing-view-prefs.ts");
  assert.match(prefs, /"1h" \| "24h" \| "7d"/);
  assert.match(prefs, /raw === "1h"/);
  assert.doesNotMatch(prefs, /30d/);
});

test("trade landing desk defaults to table view with persisted localStorage key", () => {
  const prefs = read("lib/trade-landing-view-prefs.ts");
  assert.match(prefs, /svf-grails-trade-landing-view/);
  assert.match(prefs, /DEFAULT_TRADE_LANDING_INDEX_VIEW.*"table"/);

  const landing = read("components/trade/trade-landing-desk-client.tsx");
  assert.match(landing, /DEFAULT_TRADE_LANDING_INDEX_VIEW/);
  assert.match(landing, /from "@\/lib\/trade-landing-view-prefs"/);
  assert.match(landing, /readTradeLandingViewPreference/);
  assert.match(landing, /writeTradeLandingViewPreference/);
  assert.match(landing, /view === "table"/);
});

test("applyLandingIndexOrder filters preview and index_pending when newMints", () => {
  const rows = [
    { ...indexRowFixture("live-a", "10"), status: "live" as const },
    { ...indexRowFixture("preview-b", null), status: "preview" as const },
    {
      ...indexRowFixture("pending-c", null),
      status: "index_pending" as const,
    },
    { ...indexRowFixture("live-d", "5"), status: "live" as const },
  ];

  const ordered = applyLandingIndexOrder(rows, {
    trending: false,
    newMints: true,
    timeframe: "24h",
    sortKey: "listed",
    sortDir: "desc",
  }).map((r) => r.slug);

  assert.deepEqual(ordered, ["preview-b", "pending-c"]);
});

test("applyLandingIndexOrder sorts by volume24hSol when sortKey is volume24h", () => {
  const rows = [
    indexRowFixture("a", "5"),
    indexRowFixture("b", "25"),
    indexRowFixture("c", null),
  ];

  const ordered = applyLandingIndexOrder(rows, {
    trending: false,
    timeframe: "24h",
    sortKey: "volume24h",
    sortDir: "desc",
  }).map((r) => r.slug);

  assert.deepEqual(ordered, ["b", "a", "c"]);
});

test("sortIndexRows orders by sell now with nulls last", () => {
  const row = (slug: string, sellNowSol: string | null): TensorCollectionIndexRow => ({
    ...indexRowFixture(slug, null),
    sellNowSol,
  });
  const rows = [row("low", "10"), row("high", "100"), row("missing", null), row("mid", "50")];

  const desc = sortIndexRows(rows, "sellNow", "desc").map((r) => r.slug);
  assert.deepEqual(desc, ["high", "mid", "low", "missing"]);

  const asc = sortIndexRows(rows, "sellNow", "asc").map((r) => r.slug);
  assert.deepEqual(asc, ["low", "mid", "high", "missing"]);
});

test("applyLandingIndexOrder sorts by sellNowSol when sortKey is sellNow", () => {
  const rows = [
    { ...indexRowFixture("a", null), sellNowSol: "5" },
    { ...indexRowFixture("b", null), sellNowSol: "25" },
    { ...indexRowFixture("c", null), sellNowSol: null },
  ];

  const ordered = applyLandingIndexOrder(rows, {
    trending: false,
    timeframe: "24h",
    sortKey: "sellNow",
    sortDir: "desc",
  }).map((r) => r.slug);

  assert.deepEqual(ordered, ["b", "a", "c"]);
});

test("sortIndexRows orders by 24h price change with nulls last", () => {
  const row = (slug: string, priceChange24hPct: number | null): TensorCollectionIndexRow => ({
    ...indexRowFixture(slug, null),
    priceChange24hPct,
  });
  const rows = [row("low", -5), row("high", 25), row("missing", null), row("mid", 10)];

  const desc = sortIndexRows(rows, "priceChange24h", "desc").map((r) => r.slug);
  assert.deepEqual(desc, ["high", "mid", "low", "missing"]);

  const asc = sortIndexRows(rows, "priceChange24h", "asc").map((r) => r.slug);
  assert.deepEqual(asc, ["low", "mid", "high", "missing"]);
});

test("applyLandingIndexOrder sorts by priceChange24hPct when sortKey is priceChange24h", () => {
  const rows = [
    { ...indexRowFixture("a", null), priceChange24hPct: 5 },
    { ...indexRowFixture("b", null), priceChange24hPct: 25 },
    { ...indexRowFixture("c", null), priceChange24hPct: null },
  ];

  const ordered = applyLandingIndexOrder(rows, {
    trending: false,
    timeframe: "24h",
    sortKey: "priceChange24h",
    sortDir: "desc",
  }).map((r) => r.slug);

  assert.deepEqual(ordered, ["b", "a", "c"]);
});

test("sortIndexRows orders by listed % with nulls last", () => {
  const row = (slug: string, listedPct: number | null): TensorCollectionIndexRow => ({
    ...indexRowFixture(slug, null),
    listedPct,
  });
  const rows = [row("low", 5), row("high", 40), row("missing", null), row("mid", 20)];

  const desc = sortIndexRows(rows, "listedPct", "desc").map((r) => r.slug);
  assert.deepEqual(desc, ["high", "mid", "low", "missing"]);

  const asc = sortIndexRows(rows, "listedPct", "asc").map((r) => r.slug);
  assert.deepEqual(asc, ["low", "mid", "high", "missing"]);
});

test("applyLandingIndexOrder sorts by listedPct when sortKey is listedPct", () => {
  const rows = [
    { ...indexRowFixture("a", null), listedPct: 8 },
    { ...indexRowFixture("b", null), listedPct: 32 },
    { ...indexRowFixture("c", null), listedPct: null },
  ];

  const ordered = applyLandingIndexOrder(rows, {
    trending: false,
    timeframe: "24h",
    sortKey: "listedPct",
    sortDir: "desc",
  }).map((r) => r.slug);

  assert.deepEqual(ordered, ["b", "a", "c"]);
});

test("sortIndexRows orders by market cap with nulls last", () => {
  const row = (slug: string, marketCapSol: string | null): TensorCollectionIndexRow => ({
    ...indexRowFixture(slug, null),
    marketCapSol,
  });
  const rows = [row("low", "10"), row("high", "100"), row("missing", null), row("mid", "50")];

  const desc = sortIndexRows(rows, "marketCap", "desc").map((r) => r.slug);
  assert.deepEqual(desc, ["high", "mid", "low", "missing"]);

  const asc = sortIndexRows(rows, "marketCap", "asc").map((r) => r.slug);
  assert.deepEqual(asc, ["low", "mid", "high", "missing"]);
});

test("applyLandingIndexOrder sorts by marketCapSol when sortKey is marketCap", () => {
  const rows = [
    { ...indexRowFixture("a", null), marketCapSol: "5" },
    { ...indexRowFixture("b", null), marketCapSol: "25" },
    { ...indexRowFixture("c", null), marketCapSol: null },
  ];

  const ordered = applyLandingIndexOrder(rows, {
    trending: false,
    timeframe: "24h",
    sortKey: "marketCap",
    sortDir: "desc",
  }).map((r) => r.slug);

  assert.deepEqual(ordered, ["b", "a", "c"]);
});

test("M2 landing desk wires sortable 24h vol column header", () => {
  const table = read("components/trade/tensor/collection-desk-layout.tsx");
  assert.match(table, /toggleSort\("volume24h"\)/);
  assert.match(table, /sortKey === "volume24h"/);
  assert.match(table, /toggleSort\("sellNow"\)/);
  assert.match(table, /sortKey === "sellNow"/);
  assert.match(table, /toggleSort\("priceChange24h"\)/);
  assert.match(table, /sortKey === "priceChange24h"/);
  assert.match(table, /toggleSort\("listedPct"\)/);
  assert.match(table, /sortKey === "listedPct"/);
  assert.match(table, /toggleSort\("marketCap"\)/);
  assert.match(table, /sortKey === "marketCap"/);
  assert.match(table, /label="Market cap"/);
  assert.match(table, /row\.marketCapSol/);
});

test("M2 landing index table tints 24h Δ green up pink down", () => {
  const table = read("components/trade/tensor/collection-desk-layout.tsx");
  assert.match(table, /indexPriceChange24hClass/);
  assert.match(table, /priceChange24hPct >= 0/);
  assert.match(table, /text-emerald-400/);
  assert.match(table, /text-pink-400/);
});

test("M2 landing desk wires newMints mode to toolbar and index order", () => {
  const landing = read("components/trade/trade-landing-desk-client.tsx");
  assert.match(landing, /newMintsActive=\{newMints\}/);
  assert.match(landing, /handleNewMints/);
  assert.match(landing, /newMints:/);
});

test("M2 landing desk wires refresh collections to router.refresh", () => {
  const landing = read("components/trade/trade-landing-desk-client.tsx");
  const toolbar = read("components/trade/trade-landing-index-toolbar.tsx");

  assert.match(landing, /useRouter/);
  assert.match(landing, /const router = useRouter\(\)/);
  assert.match(landing, /handleRefreshCollections/);
  assert.match(landing, /router\.refresh\(\)/);
  assert.match(landing, /onRefreshCollections=\{handleRefreshCollections\}/);
  assert.match(toolbar, /onRefreshCollections/);
  assert.match(toolbar, /aria-label="Refresh collections"/);
});

test("M2 landing desk uses single aggregate ribbon without duplicate stats strip", () => {
  const landing = read("components/trade/trade-landing-desk-client.tsx");
  const banner = read("components/trade/trade-landing-featured-banner.tsx");
  const pulse = read("components/trade/trade-landing-market-pulse.tsx");
  assert.doesNotMatch(landing, /CollectionStatsRibbon/);
  assert.match(landing, /landingAggregate\.volume24hSol/);
  assert.match(landing, /featuredVolume24hSol/);
  assert.match(landing, /TradeLandingMarketPulse/);
  assert.match(landing, /TradeLandingValueHero/);
  assert.match(pulse, /Partner listed/);
  assert.match(pulse, /Best floor/);
  assert.match(banner, /trade-landing-hero/);
  assert.match(banner, /trade-landing-ribbon/);
  assert.match(
    read("components/trade/tensor/collection-desk-layout.tsx"),
    /indexTableMetricVisibility/,
  );
});

test("trade page passes deduped landing aggregate override to desk client", () => {
  const page = read("app/trade/page.tsx");
  const landing = read("components/trade/trade-landing-desk-client.tsx");

  assert.match(page, /buildAllListingsAggregateStats/);
  assert.match(page, /applyMergedAllListingsAggregateOverride/);
  assert.match(page, /landingAggregateOverride=\{landingAggregateOverride\}/);
  assert.doesNotMatch(page, /deskListings=\{deskListings\}/);
  assert.match(landing, /landingAggregateOverride/);
  assert.doesNotMatch(landing, /deskListings: _deskListings/);
});

test("M2 landing value hero states Tensor for graded cards value prop", () => {
  const hero = read("components/trade/trade-landing-value-hero.tsx");
  const landing = read("components/trade/trade-landing-desk-client.tsx");
  const homeCta = read("components/home-trade-cta.tsx");
  assert.match(hero, /Tensor for graded cards/);
  assert.match(hero, /Browse all listings/);
  assert.match(hero, /TRADE_ROUTES\.all/);
  assert.match(hero, /Collection index/);
  assert.match(hero, /View community vault/);
  assert.match(hero, /trade-landing-value-hero/);
  assert.match(landing, /TradeLandingValueHero/);
  assert.match(landing, /TRADE_ROUTES\.all/);
  assert.match(landing, /All partner listings/);
  assert.match(homeCta, /Browse all listings/);
  assert.match(homeCta, /TRADE_ROUTES\.all/);
});

test("M2 landing desk cross-links collection index and aggregate desk", () => {
  const landing = read("components/trade/trade-landing-desk-client.tsx");
  const desk = read("components/trade/trade-collection-desk-client.tsx");
  const appHeader = read("components/trade/trade-app-header.tsx");
  const palette = read("components/trade/trade-command-palette.tsx");

  assert.match(landing, /All listings →/);
  assert.match(desk, /View all listings/);
  assert.match(desk, /Browse collection index/);
  assert.match(desk, /TRADE_ROUTES\.all/);
  assert.match(appHeader, /All listings/);
  assert.match(appHeader, /TRADE_ROUTES\.all/);
  assert.match(palette, /kind: "all_listings"/);
  assert.match(palette, /TRADE_ROUTES\.all/);
});

test("M2 landing desk shows empty index state and mobile activity teaser", () => {
  const landing = read("components/trade/trade-landing-desk-client.tsx");
  assert.match(landing, /No collections match/);
  assert.match(landing, /no placeholder rows are shown/i);
  assert.match(landing, /trade-landing-activity-teaser/);
  assert.match(landing, /xl:hidden/);
  assert.match(landing, /id="trade-collections-index"/);
});

test("M2 landing desk collection nav dense sidebar mono floor and thumb", () => {
  const nav = read("components/trade/trade-collection-nav.tsx");
  const layout = read("components/trade/tensor/collection-desk-layout.tsx");

  assert.match(nav, /trade-collection-nav__thumb/);
  assert.match(nav, /trade-collection-nav__floor/);
  assert.match(nav, /font-mono text-\[10px\]/);
  assert.match(nav, /\{collection\.floorSol\} ◎/);
  assert.match(nav, /VenueBadge/);
  assert.match(nav, /size-5/);
  assert.match(nav, /min-h-7/);
  assert.match(layout, /TradeCollectionNav/);
  assert.match(layout, /variant="sidebar"/);
});

test("M2 landing stats ribbon: trade-stats-box 1px cell dividers in globals.css", () => {
  const css = read("app/globals.css");
  assert.match(css, /\.trade-layout \.trade-stats-box \.trade-stat-cell/);
  assert.match(css, /border-right:\s*1px solid var\(--trade-line\)/);
  assert.match(css, /\.trade-layout \.trade-stats-box \.trade-stat-cell:last-child/);
  assert.match(css, /border-right-width:\s*0/);
  assert.match(css, /\.trade-landing-value-hero/);
  assert.match(css, /\.trade-landing-market-pulse/);
});

test("loadOptionalTradeLandingTreasuryContext serves JSON fallback when DB unreachable", async () => {
  const { loadOptionalTradeLandingTreasuryContext } = await import("@/lib/trade-landing");
  const { getDatabaseStatus, resetDatabaseStatusCache } = await import("@/lib/db-connection");

  const originalGetDatabaseStatus = getDatabaseStatus;
  const dbConnection = await import("@/lib/db-connection");
  dbConnection.getDatabaseStatus = async () => ({
    state: "unreachable",
    hint: "test unreachable",
    detail: "connection refused",
  });

  const originalDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://invalid:5432/test";

  try {
    resetDatabaseStatusCache();
    const context = await loadOptionalTradeLandingTreasuryContext();
    assert.equal(context.treasuryUnavailable, false);
    assert.ok(context.deskListings.length > 0);
    assert.equal(context.listResult?.fromFallback, true);
    assert.equal(context.listResult?.dbStatus, "unreachable");
  } finally {
    process.env.DATABASE_URL = originalDatabaseUrl;
    dbConnection.getDatabaseStatus = originalGetDatabaseStatus;
    resetDatabaseStatusCache();
  }
});
