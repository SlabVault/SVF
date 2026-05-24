import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildStubTradeActivityFeed,
  computeTradeCollectionStats,
  extractUniqueGrades,
  extractUniqueSetNames,
  filterTradeListings,
  looksLikeSolanaMint,
  mapSlabsToTradeListings,
  sortTradeListings,
  tradeListingOnChainMint,
  type TradeListing,
} from "@/lib/trade-listings";
import type { MarketplaceSlab } from "@/lib/marketplace-slabs";

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
  {
    id: "beta",
    name: "Pikachu",
    grade: "PSA 9",
    estimatedValueUsd: 120,
    acquiredAt: "2026-02-01",
    imageUrl: "/b.jpg",
    vaultedUrl: "https://vaulted.example/b",
    collectrUrl: null,
    status: "AVAILABLE",
    solPrice: 1.2,
    svfPrice: 12000,
  },
];

test("mapSlabsToTradeListings maps askSol from solPrice", () => {
  const listings = mapSlabsToTradeListings(sampleSlabs);
  assert.equal(listings.length, 2);
  assert.equal(listings[0]?.askSol, 2.5);
});

test("computeTradeCollectionStats derives floor and totals", () => {
  const listings = mapSlabsToTradeListings(sampleSlabs);
  const stats = computeTradeCollectionStats(listings);
  assert.equal(stats.listedCount, 2);
  assert.equal(stats.floorSol, 1.2);
  assert.equal(stats.topAskSol, 2.5);
  assert.equal(stats.totalFmvUsd, 620);
});

test("filterTradeListings applies grade and price filters", () => {
  const listings = mapSlabsToTradeListings(sampleSlabs);
  const filtered = filterTradeListings(listings, {
    grades: ["PSA 10"],
    graders: [],
    partners: [],
    minAskSol: 2,
    maxAskSol: 3,
    searchQuery: "",
    setQuery: "",
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.id, "alpha");
});

test("filterTradeListings applies grader filter", () => {
  const listings = mapSlabsToTradeListings(sampleSlabs);
  const filtered = filterTradeListings(listings, {
    grades: [],
    graders: ["PSA"],
    partners: [],
    minAskSol: null,
    maxAskSol: null,
    searchQuery: "",
    setQuery: "",
  });
  assert.equal(filtered.length, 2);
});

test("extractUniqueGrades returns sorted unique grades", () => {
  const listings = mapSlabsToTradeListings(sampleSlabs);
  assert.deepEqual(extractUniqueGrades(listings), ["PSA 10", "PSA 9"]);
});

test("filterTradeListings applies set query against setName and title", () => {
  const listings = mapSlabsToTradeListings(sampleSlabs).map((listing, index) => ({
    ...listing,
    setName: index === 0 ? "Base Set" : "Jungle",
  }));

  const bySetName = filterTradeListings(listings, {
    grades: [],
    graders: [],
    partners: [],
    minAskSol: null,
    maxAskSol: null,
    searchQuery: "",
    setQuery: "jungle",
  });
  assert.equal(bySetName.length, 1);
  assert.equal(bySetName[0]?.id, "beta");

  const byTitle = filterTradeListings(listings, {
    grades: [],
    graders: [],
    partners: [],
    minAskSol: null,
    maxAskSol: null,
    searchQuery: "",
    setQuery: "char",
  });
  assert.equal(byTitle.length, 1);
  assert.equal(byTitle[0]?.id, "alpha");
});

test("extractUniqueSetNames returns sorted unique set names", () => {
  const listings = mapSlabsToTradeListings(sampleSlabs).map((listing, index) => ({
    ...listing,
    setName: index === 0 ? "Base Set" : "Base Set",
  }));
  assert.deepEqual(extractUniqueSetNames(listings), ["Base Set"]);
});

test("buildStubTradeActivityFeed creates list events from listings", () => {
  const listings = mapSlabsToTradeListings(sampleSlabs);
  const events = buildStubTradeActivityFeed(listings);
  assert.equal(events.length, 2);
  assert.equal(events[0]?.type, "list");
  assert.equal(events[0]?.slabId, "beta");
});

test("sortTradeListings orders by price and recency", () => {
  const listings = mapSlabsToTradeListings(sampleSlabs);
  const byPrice = sortTradeListings(listings, "price_asc");
  assert.equal(byPrice[0]?.id, "beta");
  const byRecent = sortTradeListings(listings, "recent");
  assert.equal(byRecent[0]?.id, "beta");
});

test("tradeListingOnChainMint prefers listing.id when base58 mint", () => {
  const mint = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
  const listing = {
    ...mapSlabsToTradeListings(sampleSlabs)[0]!,
    id: mint,
    vaultedUrl: "https://vaulted.example/other",
  } satisfies TradeListing;
  assert.equal(tradeListingOnChainMint(listing), mint);
});

test("tradeListingOnChainMint resolves mint from solscan vaultedUrl when id is cert", () => {
  const mint = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
  const listing = {
    ...mapSlabsToTradeListings(sampleSlabs)[0]!,
    id: "12345678",
    vaultedUrl: `https://solscan.io/token/${mint}`,
  } satisfies TradeListing;
  assert.equal(tradeListingOnChainMint(listing), mint);
});

test("tradeListingOnChainMint returns null for non-mint id without solscan link", () => {
  const listing = mapSlabsToTradeListings(sampleSlabs)[0]!;
  assert.equal(tradeListingOnChainMint(listing), null);
});

test("looksLikeSolanaMint rejects UUID partner externalIds", () => {
  assert.equal(
    looksLikeSolanaMint("5be074a0-c8bd-4a31-954a-9b523949e654"),
    false,
  );
});
