import assert from "node:assert/strict";
import { test } from "node:test";

import type { TensorCollectionStats } from "@/lib/onchain/tensor-api";
import {
  formatPriceChange24h,
  mapTensorStatsToRibbonMetrics,
  resolveStatsRibbonDisplay,
} from "@/lib/trade/tensor-ribbon-metrics";
import type { TradeCollectionStats } from "@/lib/trade-listings";

const baseStats: TensorCollectionStats = {
  collId: "c1",
  slug: "collector_crypt",
  slugDisplay: "collector_crypt",
  name: "CC",
  imageUri: null,
  numListed: 40,
  floorPriceLamports: 2_000_000_000,
  floorPriceSol: 2,
  volume24hLamports: 50_000_000_000,
  volume24hSol: 50,
  volumeAllLamports: 500_000_000_000,
  volumeAllSol: 500,
  sales24h: 12,
  priceChange24hPct: 5.5,
  numMints: 200,
  pctListed: 20,
};

test("mapTensorStatsToRibbonMetrics maps Tensor statsV2 fields", () => {
  const ribbon = mapTensorStatsToRibbonMetrics(baseStats);

  assert.equal(ribbon.buyNowSol, 2);
  assert.equal(ribbon.sellNowSol, 2);
  assert.equal(ribbon.volume24hSol, 50);
  assert.equal(ribbon.volumeAllSol, 500);
  assert.equal(ribbon.sales24h, 12);
  assert.equal(ribbon.priceChange24hPct, 5.5);
  assert.equal(ribbon.supplyCount, 200);
  assert.equal(ribbon.listedCount, 40);
  assert.equal(ribbon.listedPct, 20);
});

test("mapTensorStatsToRibbonMetrics derives listedPct from numListed/numMints", () => {
  const ribbon = mapTensorStatsToRibbonMetrics({
    ...baseStats,
    pctListed: null,
    numMints: 100,
    numListed: 25,
  });

  assert.equal(ribbon.listedPct, 25);
});

test("mapTensorStatsToRibbonMetrics prefers numListed/numMints over pctListed", () => {
  const ribbon = mapTensorStatsToRibbonMetrics({
    ...baseStats,
    pctListed: 99,
    numMints: 100,
    numListed: 25,
  });

  assert.equal(ribbon.listedPct, 25);
});

test("formatPriceChange24h renders signed percent or em dash", () => {
  assert.equal(formatPriceChange24h(3.2), "+3.2%");
  assert.equal(formatPriceChange24h(-1.1), "-1.1%");
  assert.equal(formatPriceChange24h(null), "—");
});

const ingestStats: TradeCollectionStats = {
  listedCount: 10,
  floorSol: 1.5,
  topAskSol: 3,
  totalFmvUsd: null,
};

test("resolveStatsRibbonDisplay uses Tensor metrics when present", () => {
  const tensor = mapTensorStatsToRibbonMetrics(baseStats);
  const ribbon = resolveStatsRibbonDisplay(ingestStats, tensor);

  assert.equal(ribbon.buyNow, "2 ◎");
  assert.equal(ribbon.sellNow, "2 ◎");
  assert.equal(ribbon.listed, "40 / 200 (20%)");
  assert.equal(ribbon.volume24h, "50 ◎");
  assert.equal(ribbon.volumeAll, "500 ◎");
  assert.equal(ribbon.sales24h, "12");
  assert.equal(ribbon.priceChange24h, "+5.5%");
});

test("resolveStatsRibbonDisplay falls back to ingest floor without Tensor", () => {
  const ribbon = resolveStatsRibbonDisplay(ingestStats, null);

  assert.equal(ribbon.buyNow, "1.5 ◎");
  assert.equal(ribbon.sellNow, "1.5 ◎");
  assert.equal(ribbon.listed, "10");
  assert.equal(ribbon.volume24h, "—");
  assert.equal(ribbon.volumeAll, "—");
  assert.equal(ribbon.sales24h, "—");
  assert.equal(ribbon.priceChange24h, "—");
});

test("resolveStatsRibbonDisplay derives listing ribbon metrics when stats omit them", () => {
  const listings = [
    {
      id: "recent",
      name: "Recent list",
      grade: "PSA 10",
      estimatedValueUsd: 100,
      acquiredAt: new Date().toISOString(),
      imageUrl: "/a.jpg",
      vaultedUrl: null,
      collectrUrl: null,
      status: "AVAILABLE" as const,
      solPrice: 2,
      svfPrice: 0,
      askSol: 2,
      collectionId: "collector-crypt",
    },
    {
      id: "older",
      name: "Older list",
      grade: "PSA 9",
      estimatedValueUsd: 80,
      acquiredAt: "2020-01-01T00:00:00.000Z",
      imageUrl: "/b.jpg",
      vaultedUrl: null,
      collectrUrl: null,
      status: "AVAILABLE" as const,
      solPrice: 5,
      svfPrice: 0,
      askSol: 5,
      collectionId: "collector-crypt",
    },
  ];

  const ribbon = resolveStatsRibbonDisplay(ingestStats, null, listings);

  assert.equal(ribbon.volume24h, "2 ◎");
  assert.equal(ribbon.volumeAll, "7 ◎");
});
