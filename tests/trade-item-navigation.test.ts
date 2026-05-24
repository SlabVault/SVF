import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildTradeItemHref,
  getTradeItemAdjacentLinks,
} from "@/lib/trade/item-navigation";
import {
  buildItemFooterStatCells,
  formatListedSupply,
} from "@/lib/trade/item-footer-stats";
import { estimateTradeListingUsd } from "@/lib/trade/trade-modal";
import type { TradeListing } from "@/lib/trade-listings";

const ROOT = process.cwd();

function read(relPath: string) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

function listing(id: string, askSol: number, name?: string): TradeListing {
  return {
    id,
    name: name ?? `Slab #${id}`,
    grade: "PSA 10",
    askSol,
    collectionId: "slabvault-treasury",
    acquiredAt: "2026-01-01",
    imageUrl: "/x.jpg",
    vaultedUrl: null,
    collectrUrl: null,
    status: "AVAILABLE",
    estimatedValueUsd: 100,
    solPrice: askSol,
    svfPrice: 10000,
  };
}

test("getTradeItemAdjacentLinks orders by price asc and links prev/next", () => {
  const rows = [listing("c", 3), listing("a", 1), listing("b", 2)];
  const current = rows[1]!;
  const adjacent = getTradeItemAdjacentLinks(rows, current, "slabvault-treasury");

  assert.equal(adjacent.index, 0);
  assert.equal(adjacent.total, 3);
  assert.equal(adjacent.prevHref, null);
  assert.match(adjacent.nextHref ?? "", /\/trade\/slab\/b\?collection=slabvault-treasury/);
});

test("getTradeItemAdjacentLinks resolves middle item prev and next", () => {
  const rows = [listing("a", 1), listing("b", 2), listing("c", 3)];
  const adjacent = getTradeItemAdjacentLinks(rows, rows[1]!, "collector-crypt");

  assert.equal(adjacent.index, 1);
  assert.match(adjacent.prevHref ?? "", /\/trade\/slab\/a/);
  assert.match(adjacent.nextHref ?? "", /\/trade\/slab\/c/);
});

test("buildTradeItemHref prefers cert number from listing name", () => {
  const row = listing("mint-xyz", 2, "Charizard PSA 10 #12345678");
  assert.equal(
    buildTradeItemHref(row, "slabvault-treasury"),
    "/trade/slab/12345678?collection=slabvault-treasury",
  );
});

test("item mobile action bar wires list for sale when connected", () => {
  const bar = read("components/trade/trade-mobile-action-bar.tsx");
  const client = read("components/trade/trade-item-detail-client.tsx");

  assert.doesNotMatch(bar, /Coming soon/);
  assert.match(bar, /onList\?\./);
  assert.match(bar, /cta_trade_list_for_sale/);
  assert.match(client, /onList=\{openList\}/);
  assert.match(client, /ListForSaleModal/);
  assert.match(client, /mint=\{onChainMint\}/);
  assert.match(client, /resolveTradeListingMint/);
});

test("BuyNowModal listed row shows ◎ with USD estimate", () => {
  const modal = read("components/trade/buy-now-modal.tsx");

  assert.match(modal, /Listed price/);
  assert.match(modal, /formatListedAskUsd/);
  assert.match(modal, /\$\{listing\.askSol\} ◎/);
  assert.match(modal, /formatUsd\(listedUsd\)/);
  assert.doesNotMatch(modal, /Est\. USD/);
});

test("estimateTradeListingUsd prefers FMV then askSol fallback", () => {
  assert.equal(estimateTradeListingUsd(listing("fmv", 2)), 100);
  const noFmv: TradeListing = {
    ...listing("ask", 2),
    estimatedValueUsd: null,
  };
  assert.equal(estimateTradeListingUsd(noFmv), 300);
});

test("item slab page passes adjacent listing links to client", () => {
  const page = read("app/trade/slab/[certOrMint]/page.tsx");
  const client = read("components/trade/trade-item-detail-client.tsx");

  assert.match(page, /getTradeItemAdjacentLinks/);
  assert.match(page, /adjacentItems=\{adjacentItems\}/);
  assert.match(client, /ItemNavArrows/);
  assert.match(client, /Prev/);
  assert.match(client, /Next/);
  assert.match(client, /ItemFooterStats/);
  assert.match(client, /trade-item-stats-ribbon/);
  assert.match(client, /buildItemFooterStatCells/);
});

test("item detail client renders SALE HISTORY stub under media column", () => {
  const client = read("components/trade/trade-item-detail-client.tsx");

  assert.match(client, /ItemSaleHistoryStub/);
  assert.match(client, /Sale history/);
  assert.match(client, /30D/);
  assert.match(client, /Sale history chart — coming soon/);
  assert.match(client, /aria-label="Sale history"/);
});

test("item slab page passes venue compare rows from aggregate merge", () => {
  const page = read("app/trade/slab/[certOrMint]/page.tsx");
  const client = read("components/trade/trade-item-detail-client.tsx");

  assert.match(page, /loadAllTradeListings/);
  assert.match(page, /buildVenueCompareRows/);
  assert.match(page, /venueCompareRows=\{venueCompareRows\}/);
  assert.match(client, /venueCompareRows\?: VenueCompareRow\[\]/);
});

test("M2 item page COMPARE tab: alternateVenueAsks venue compare strip", () => {
  const client = read("components/trade/trade-item-detail-client.tsx");
  const venueCompare = read("lib/trade/venue-compare.ts");

  assert.match(client, /\{ id: "compare", label: "COMPARE" \}/);
  assert.doesNotMatch(client, /\{ id: "compare", label: "COMPARE", soon: true \}/);
  assert.match(client, /ItemVenueCompareStrip/);
  assert.match(client, /venueCompareSummary/);
  assert.match(client, /Buy on GRAILS/);
  assert.match(client, /activeTab === "compare"/);
  assert.match(
    client,
    /function resolveVenuePartnerCheckoutUrl[\s\S]*resolvePartnerDeepLink\(/,
  );
  assert.match(
    client,
    /function ItemVenueCompareStrip[\s\S]*resolveVenuePartnerCheckoutUrl\(listing, row\)/,
  );
  assert.match(
    client,
    /function ItemVenueCompareStrip[\s\S]*data-growth-event="cta_trade_partner_deep_link"/,
  );
  assert.match(
    client,
    /function ItemVenueCompareStrip[\s\S]*data-growth-context=\{`trade_compare_partner:\$\{listing\.id\}:\$\{row\.partner\}`\}/,
  );
  assert.match(client, /function ItemVenueCompareStrip[\s\S]*site ↗/);
  assert.match(venueCompare, /buildVenueCompareRows/);
  assert.match(venueCompare, /alternateVenueAsks/);
});

test("M2 item page OFFERS tab: Soon label and honest connect shell", () => {
  const client = read("components/trade/trade-item-detail-client.tsx");
  const offers = read("components/trade/item-offers-panel.tsx");

  assert.match(client, /\{ id: "offers", label: "OFFERS", soon: true \}/);
  assert.doesNotMatch(client, /ItemTabSoon/);
  assert.match(
    client,
    /activeTab === "offers"[\s\S]*<ItemOffersPanel listingId=\{listing\.id\} \/>/,
  );
  assert.match(offers, /Connect wallet to view offers/);
  assert.match(offers, /No offers on this item/);
  assert.match(offers, /aria-label="Item offers"/);
  assert.match(offers, /No placeholder rows are shown/);
});

test("formatListedSupply shows listed/supply ratio when supply is known", () => {
  const stats = {
    listedCount: 42,
    floorSol: 1,
    topAskSol: 5,
    totalFmvUsd: null,
  };

  assert.equal(
    formatListedSupply(stats, {
      supplyCount: 1000,
      listedPct: 4,
      sellNowSol: null,
      volume24hSol: null,
      volumeAllSol: null,
      sales24h: null,
      priceChange24hPct: null,
    }),
    "42 / 1000 (4%)",
  );
});

test("formatListedSupply returns ingest listed count when supply is missing", () => {
  const stats = {
    listedCount: 42,
    floorSol: 1,
    topAskSol: 5,
    totalFmvUsd: null,
  };

  assert.equal(formatListedSupply(stats, null), "42");
});

test("buildItemFooterStatCells fills tensor metrics and honest dashes", () => {
  const stats = {
    listedCount: 10,
    floorSol: 2.5,
    topAskSol: 5,
    totalFmvUsd: null,
  };

  const cells = buildItemFooterStatCells(stats, "Test Coll", {
    supplyCount: 100,
    listedPct: 10,
    volume24hSol: 50,
    sales24h: 3,
    priceChange24hPct: -2.5,
    sellNowSol: null,
    volumeAllSol: null,
  });
  const byLabel = Object.fromEntries(cells.map((cell) => [cell.label, cell.value]));

  assert.equal(byLabel["Collection"], "Test Coll");
  assert.equal(byLabel["Floor"], "2.5 ◎");
  assert.equal(byLabel["Listed / supply"], "10 / 100 (10%)");
  assert.equal(byLabel["24h floor Δ"], "-2.5%");
  assert.equal(byLabel["24h vol"], "50 ◎");
  assert.equal(byLabel["24h sales"], "3");

  const sparse = buildItemFooterStatCells(stats, "X", null);
  const sparseByLabel = Object.fromEntries(
    sparse.map((cell) => [cell.label, cell.value]),
  );

  assert.equal(sparseByLabel["Listed / supply"], "10");
  assert.equal(sparseByLabel["24h vol"], "—");
  assert.equal(sparseByLabel["24h sales"], "—");
});

test("PlaceOfferModal uses Tensor write-gate hint copy", () => {
  const source = read("components/trade/place-offer-modal.tsx");

  assert.match(source, /On-chain bids route through Tensor/);
  assert.match(source, /TENSOR_TRADE_WRITE_ENABLED/);
  assert.match(source, /Escrowed bids stay active on Tensor/);
  assert.doesNotMatch(source, /\/api\/trade\/tx\/bid/);
});
