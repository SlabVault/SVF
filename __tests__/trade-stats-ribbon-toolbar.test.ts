import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import {
  buildTradeFilterSearchParams,
  parseTradeFiltersFromSearchParams,
  tradeFilterSearchString,
} from "@/lib/trade/trade-filter-url";
import {
  resolveStatsRibbonDisplay,
  type TensorRibbonMetrics,
} from "@/lib/trade/tensor-ribbon-metrics";
import { DEFAULT_TRADE_FILTERS, type TradeCollectionStats } from "@/lib/trade-listings";

const ROOT = process.cwd();

function read(relPath: string) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

const ingestStats: TradeCollectionStats = {
  listedCount: 42,
  floorSol: 2.25,
  topAskSol: 4,
  totalFmvUsd: null,
};

const tensorRibbon: TensorRibbonMetrics = {
  buyNowSol: 3,
  sellNowSol: 2.5,
  volume24hSol: 18,
  volumeAllSol: 900,
  sales24h: 7,
  priceChange24hPct: -2.4,
  supplyCount: 500,
  listedCount: 42,
  listedPct: 8,
};

test("M2 URL filters: parse grader, grade, min, max, and toolbar q", () => {
  const params = new URLSearchParams(
    "grader=PSA,BGS&grade=PSA%2010,BGS%209.5&min=0.5&max=10&q=pikachu",
  );
  const filters = parseTradeFiltersFromSearchParams(params);

  assert.deepEqual(filters.graders, ["PSA", "BGS"]);
  assert.deepEqual(filters.grades, ["PSA 10", "BGS 9.5"]);
  assert.equal(filters.minAskSol, 0.5);
  assert.equal(filters.maxAskSol, 10);
  assert.equal(filters.searchQuery, "pikachu");
});

test("M2 URL filters: toolbar search serializes to q param", () => {
  const query = tradeFilterSearchString({
    ...DEFAULT_TRADE_FILTERS,
    searchQuery: "  holo charizard  ",
  });
  assert.equal(query, "q=holo+charizard");
});

test("M2 URL filters: round-trip preserves active desk filters", () => {
  const filters = {
    ...DEFAULT_TRADE_FILTERS,
    graders: ["CGC"],
    grades: ["CGC 10"],
    minAskSol: 1,
    maxAskSol: 20,
    searchQuery: "mewtwo",
    setQuery: "Base Set",
  };
  const rebuilt = parseTradeFiltersFromSearchParams(
    buildTradeFilterSearchParams(filters),
  );
  assert.deepEqual(rebuilt, filters);
});

test("M2 stats ribbon: seven cells from Tensor + ingest merge", () => {
  const ribbon = resolveStatsRibbonDisplay(ingestStats, tensorRibbon);

  assert.equal(ribbon.buyNow, "3 ◎");
  assert.equal(ribbon.sellNow, "2.5 ◎");
  assert.equal(ribbon.listed, "42 / 500 (8%)");
  assert.equal(ribbon.volume24h, "18 ◎");
  assert.equal(ribbon.volumeAll, "900 ◎");
  assert.equal(ribbon.sales24h, "7");
  assert.equal(ribbon.priceChange24h, "-2.4%");
  assert.equal(ribbon.priceChange24hPct, -2.4);
});

test("M2 stats ribbon: ingest fallback when Tensor unkeyed", () => {
  const statsWithIngest: TradeCollectionStats = {
    ...ingestStats,
    volume24hSol: 12,
    volumeAllSol: 250,
    sales24h: 3,
    priceChange24hPct: 1.5,
  };
  const ribbon = resolveStatsRibbonDisplay(statsWithIngest, null);

  assert.equal(ribbon.volume24h, "12 ◎");
  assert.equal(ribbon.volumeAll, "250 ◎");
  assert.equal(ribbon.sales24h, "3");
  assert.equal(ribbon.priceChange24h, "+1.5%");
  assert.equal(ribbon.priceChange24hPct, 1.5);
});

test("M2 stats ribbon: stats grid renders all metric labels", () => {
  const statsGrid = read("components/trade/tensor/stats-grid.tsx");
  assert.match(statsGrid, /BUY NOW/);
  assert.match(statsGrid, /SELL NOW/);
  assert.match(statsGrid, /LISTED/);
  assert.match(statsGrid, /24H VOL/);
  assert.match(statsGrid, /VOLUME \(ALL\)/);
  assert.match(statsGrid, /24H SALES/);
  assert.match(statsGrid, /24H PRICE Δ/);
  assert.match(statsGrid, /resolveStatsRibbonDisplay/);
});

test("M2 grid toolbar: desk wires search, density, sort, refresh", () => {
  const desk = read("components/trade/trade-collection-desk-client.tsx");
  const toolbar = read("components/trade/trade-desk-toolbar.tsx");

  assert.match(desk, /TradeDeskToolbar/);
  assert.match(desk, /searchQuery=\{filters\.searchQuery\}/);
  assert.match(desk, /onSearchChange=\{\(searchQuery\)/);
  assert.match(desk, /setFilters\(\(current\) => \(\{ \.\.\.current, searchQuery \}\)\)/);
  assert.match(desk, /gridDensity=\{gridDensity\}/);
  assert.match(desk, /onDensityChange=\{setGridDensity\}/);
  assert.match(desk, /onRefresh=\{\(\) => setRefreshKey/);

  assert.match(toolbar, /Search NFTs by name or grade/);
  assert.match(toolbar, /aria-label="Grid density"/);
  assert.match(toolbar, /value: "s"/);
  assert.match(toolbar, /value: "m"/);
  assert.match(toolbar, /value: "l"/);
  assert.match(toolbar, /Price \(low to high\)/);
  assert.match(toolbar, /Recently listed/);
  assert.match(toolbar, /Refresh/);
});

test("M2 collection desk: stats ribbon receives tensorRibbon prop", () => {
  const desk = read("components/trade/trade-collection-desk-client.tsx");
  const ribbon = read("components/trade/collection-stats-ribbon.tsx");

  assert.match(desk, /tensorRibbon=\{tensorRibbon\}/);
  assert.match(desk, /CollectionStatsRibbon/);
  assert.match(ribbon, /TensorStatsGrid/);
});
