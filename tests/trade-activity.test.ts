import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, test } from "node:test";

import {
  getTradeCollectionActivity,
  mapTensorTxToTradeActivityEvent,
} from "@/lib/trade/trade-activity";
import { buildTradeItemHref } from "@/lib/trade/item-navigation";
import { mapSlabsToTradeListings } from "@/lib/trade-listings";
import type { MarketplaceSlab } from "@/lib/marketplace-slabs";

const ROOT = process.cwd();

function read(relPath: string) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

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

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnv };
});

test("mapTensorTxToTradeActivityEvent maps list and sale rows", () => {
  const listEvent = mapTensorTxToTradeActivityEvent({
    txId: "sig-list",
    txType: "LIST",
    mint: "Mint1111111111111111111111111111111111111",
    name: "Charizard",
    priceLamports: 1_500_000_000,
    priceSol: 1.5,
    blockTime: 1_700_000_000,
    source: "TENSORSWAP",
  });

  assert.equal(listEvent.type, "list");
  assert.equal(listEvent.amountSol, 1.5);
  assert.equal(listEvent.label, "Listed");

  const saleEvent = mapTensorTxToTradeActivityEvent({
    txId: "sig-sale",
    txType: "SALE_BUY_NOW",
    mint: "Mint2222222222222222222222222222222222222",
    name: "Pikachu",
    priceLamports: 900_000_000,
    priceSol: 0.9,
    blockTime: 1_700_000_100,
    source: "TENSORSWAP",
  });

  assert.equal(saleEvent.type, "sale");
  assert.equal(saleEvent.label, "Sold");
});

test("getTradeCollectionActivity falls back to synthetic without API key when seed-only", async () => {
  delete process.env.TENSOR_API_KEY;

  const listings = mapSlabsToTradeListings(sampleSlabs);
  const result = await getTradeCollectionActivity("collector-crypt", {
    listings,
    seedOnly: true,
  });

  assert.equal(result.source, "synthetic");
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0]?.type, "list");
});

test("getTradeCollectionActivity uses ingest source for live listings without API key", async () => {
  delete process.env.TENSOR_API_KEY;

  const listings = mapSlabsToTradeListings(sampleSlabs);
  const result = await getTradeCollectionActivity("collector-crypt", { listings });

  assert.equal(result.source, "ingest");
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0]?.type, "list");
});

test("getTradeCollectionActivity returns tensor events when tx history responds", async () => {
  process.env.TENSOR_API_KEY = "test-key";
  process.env.TENSOR_API_BASE_URL = "https://api.example.test";
  process.env.TENSOR_CC_COLLECTION_SLUGS = "collector_crypt";

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url.includes("/api/v1/collections?")) {
      return new Response(
        JSON.stringify({
          collections: [{ collId: "coll-abc", slug: "collector_crypt" }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.includes("/api/v1/collections/tx_history")) {
      return new Response(
        JSON.stringify({
          txs: [
            {
              txId: "sig-sale-1",
              txType: "SALE_BUY_NOW",
              mint: "Mint1111111111111111111111111111111111111",
              name: "Charizard",
              price: 2_000_000_000,
              blockTime: 1_700_000_200,
              source: "TENSORSWAP",
            },
            {
              txId: "sig-list-1",
              txType: "LIST",
              mint: "Mint2222222222222222222222222222222222222",
              name: "Pikachu",
              price: 1_000_000_000,
              blockTime: 1_700_000_100,
              source: "TENSORSWAP",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    return new Response("not found", { status: 404 });
  };

  const result = await getTradeCollectionActivity("collector-crypt", {
    listings: mapSlabsToTradeListings(sampleSlabs),
  });

  assert.equal(result.source, "tensor_api");
  assert.equal(result.events.length, 2);
  assert.equal(result.events[0]?.type, "sale");
  assert.equal(result.events[1]?.type, "list");
});

test("getTradeCollectionActivity falls back when Tensor tx history is empty", async () => {
  process.env.TENSOR_API_KEY = "test-key";
  process.env.TENSOR_API_BASE_URL = "https://api.example.test";
  process.env.TENSOR_CC_COLLECTION_SLUGS = "collector_crypt";

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url.includes("/api/v1/collections?")) {
      return new Response(
        JSON.stringify({
          collections: [{ collId: "coll-abc", slug: "collector_crypt" }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.includes("/api/v1/collections/tx_history")) {
      return new Response(JSON.stringify({ txs: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response("not found", { status: 404 });
  };

  const listings = mapSlabsToTradeListings(sampleSlabs);
  const result = await getTradeCollectionActivity("collector-crypt", { listings });

  assert.equal(result.source, "ingest");
  assert.equal(result.events.length, 1);
});

test("TradeActivityFeed links rows with slabId via buildTradeItemHref", () => {
  const feed = read("components/trade-activity-feed.tsx");
  const panel = read("components/trade/trade-activity-panel.tsx");

  assert.match(feed, /import Link from "next\/link"/);
  assert.match(feed, /buildTradeItemHref/);
  assert.match(feed, /collectionSlug\?: string/);
  assert.match(feed, /event\.slabId && collectionSlug/);
  assert.match(feed, /<Link[\s\S]*href=\{itemHref\}/);
  assert.match(feed, /focus-visible:ring/);
  assert.match(feed, /LIST/);
  assert.match(feed, /trade-activity-label--list/);
  assert.match(feed, /source === "synthetic"/);
  assert.match(feed, /\s+Preview\s+/);
  assert.match(panel, /collectionSlug=\{collectionSlug\}/);
  assert.match(panel, /syntheticActivity && events\.length > 0/);
});

test("buildActivityItemHref pattern resolves mint to trade slab route", () => {
  const mint = "Mint1111111111111111111111111111111111111";
  const href = buildTradeItemHref(
    {
      id: mint,
      name: "Charizard",
    } as import("@/lib/trade-listings").TradeListing,
    "collector-crypt",
  );

  assert.equal(
    href,
    `/trade/slab/${encodeURIComponent(mint)}?collection=collector-crypt`,
  );
});
