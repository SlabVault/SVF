import assert from "node:assert/strict";
import { test } from "node:test";

import type { MarketplaceSlab } from "@/lib/marketplace-slabs";
import {
  getTradeLandingCollections,
  getTradeLandingDeskListings,
  getTradeLandingStats,
  getTradeLandingTreasuryStats,
  loadTradeLandingPartnerPreviews,
  TRADE_LIQUIDITY_VENUES,
} from "@/lib/trade-landing";

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
        volume24hSol: 12.5,
        priceChange24hPct: -3.2,
        listedPct: null,
      },
      {
        slug: "phygitals",
        partner: "phygitals",
        floorSol: 0.9,
        listedCount: 18,
        fromFallback: true,
        volume24hSol: 4.1,
        priceChange24hPct: 1.8,
        listedPct: null,
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
  assert.equal(cc?.volume24hSol, "12.5");
  assert.equal(cc?.priceChange24hPct, -3.2);
  assert.equal(cc?.listedPct, null);

  assert.ok(phy);
  assert.equal(phy?.floorSol, "0.9");
  assert.equal(phy?.sellNowSol, "0.9");
  assert.equal(phy?.listedCount, 18);
  assert.equal(phy?.status, "live");
  assert.equal(phy?.volume24hSol, "4.1");
  assert.equal(phy?.priceChange24hPct, 1.8);
});

test("getTradeLandingCollections wires treasury ingest ribbon stats", () => {
  const collections = getTradeLandingCollections({
    floorSol: 2.5,
    listedCount: 1,
    volume24hSol: 2.5,
    priceChange24hPct: null,
    listedPct: null,
  });
  const treasury = collections.find((c) => c.slug === "slabvault-treasury");

  assert.ok(treasury);
  assert.equal(treasury?.volume24hSol, "2.5");
  assert.equal(treasury?.priceChange24hPct, null);
});

test("loadTradeLandingPartnerPreviews loads CC and Phygitals in parallel", async () => {
  const { withTemporaryEnv } = await import("./helpers/test-helpers");
  const { computeTradeCollectionStats, deriveIngestListedPct } = await import(
    "@/lib/trade-listings"
  );
  const { getPartnerListingSeedCount } = await import("@/lib/partner-listings");

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

    for (const preview of context.previews) {
      const listings = context.partnerListings.filter(
        (listing) => listing.collectionId === preview.slug,
      );
      const expected = computeTradeCollectionStats(listings);
      assert.equal(preview.volume24hSol, expected.volume24hSol ?? null);
      assert.equal(preview.priceChange24hPct, expected.priceChange24hPct ?? null);
      assert.equal(
        preview.listedPct,
        deriveIngestListedPct(
          preview.listedCount,
          getPartnerListingSeedCount(preview.partner),
        ),
      );
    }
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

test("resolveCollectionDeskStats surfaces listing ribbon metrics without Tensor", async () => {
  const { withTemporaryEnv } = await import("./helpers/test-helpers");
  const { listPartnerTradeListings } = await import("@/lib/partner-listings");
  const { getTradeCollectionBySlug } = await import("@/lib/onchain/collections");
  const {
    computeTradeCollectionStats,
    ensureCollectionStatsRibbonFromListings,
  } = await import("@/lib/trade-listings");
  const {
    resolveCollectionDeskStats,
    resolveStatsRibbonDisplay,
  } = await import("@/lib/trade/tensor-ribbon-metrics");

  await withTemporaryEnv({ DATABASE_URL: undefined, TENSOR_API_KEY: undefined }, async () => {
    const collection = getTradeCollectionBySlug("collector-crypt");
    assert.ok(collection);

    const partner = await listPartnerTradeListings(collection);
    const partialStats = {
      listedCount: partner.stats.listedCount,
      floorSol: partner.stats.floorSol,
      topAskSol: partner.stats.topAskSol,
      totalFmvUsd: partner.stats.totalFmvUsd,
    };
    const deskStats = resolveCollectionDeskStats(
      partialStats,
      partner.listings,
      [],
    );
    const expected = ensureCollectionStatsRibbonFromListings(
      computeTradeCollectionStats(partner.listings),
      partner.listings,
    );

    assert.equal(deskStats.volumeAllSol, expected.volumeAllSol);
    assert.equal(deskStats.volume24hSol, expected.volume24hSol);
    assert.equal(deskStats.priceChange24hPct, expected.priceChange24hPct);

    const ribbon = resolveStatsRibbonDisplay(partialStats, null, partner.listings);
    assert.ok(ribbon.volumeAll !== "—");
    if (expected.volume24hSol != null) {
      assert.equal(ribbon.volume24h, `${expected.volume24hSol} ◎`);
    }
  });
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
    assert.ok(context.treasuryStats);
    assert.ok(context.deskListings.length > 0);
    assert.equal(context.listResult?.fromFallback, true);
    assert.equal(context.listResult?.dbStatus, "unreachable");
  } finally {
    process.env.DATABASE_URL = originalDatabaseUrl;
    dbConnection.getDatabaseStatus = originalGetDatabaseStatus;
    resetDatabaseStatusCache();
  }
});
