import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();

function read(relPath: string) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

const DESK = "components/trade/trade-collection-desk-client.tsx";
const LAYOUT = "components/trade/tensor/collection-desk-layout.tsx";

test("M2 pro layout: trade panel, filters, grid, activity on xl", () => {
  const layout = read(LAYOUT);
  const desk = read(DESK);

  assert.match(layout, /trade-desk-pro-row/);
  assert.match(layout, /trade-desk-pro-panel[\s\S]*xl:flex/);
  assert.match(layout, /trade-desk-pro-filters[\s\S]*md:flex/);
  assert.match(layout, /trade-desk-pro-main[\s\S]*min-w-0/);
  assert.match(layout, /trade-desk-pro-activity/);
  assert.match(layout, /overflow-hidden/);
  assert.match(desk, /TensorTradePanel/);
  assert.match(desk, /TradeTraitFilters/);
  assert.match(desk, /TradeActivityPanel/);
  assert.match(desk, /trade-desk-pro-activity-inner/);
});

test("M2 collection desk tabs: BIDS live, ORDERS/TRAITS/HODLERS panels wired", () => {
  const desk = read(DESK);

  assert.match(desk, /\{ id: "bids", label: "BIDS" \}/);
  assert.doesNotMatch(desk, /\{ id: "bids", label: "BIDS", soon: true \}/);
  assert.match(desk, /CollectionBidsPanel/);

  assert.match(desk, /\{ id: "orders", label: "ORDERS" \}/);
  assert.match(desk, /\{ id: "traits", label: "TRAITS" \}/);
  assert.match(desk, /\{ id: "holders", label: "HODLERS" \}/);
  assert.doesNotMatch(desk, /\{ id: "orders", label: "ORDERS", soon: true \}/);

  assert.match(
    desk,
    /activeTab === "orders"[\s\S]*<CollectionOrdersPanel collectionSlug=\{collection\.slug\} \/>/,
  );
  assert.match(
    desk,
    /activeTab === "traits"[\s\S]*<CollectionTraitsPanel listings=\{filteredListings\} \/>/,
  );
  assert.match(
    desk,
    /activeTab === "holders"[\s\S]*<CollectionHoldersPanel collectionSlug=\{collection\.slug\} \/>/,
  );

  assert.doesNotMatch(desk, /CollectionTabSoon/);
});

test("M2 collection desk panel shells match tensor tab density", () => {
  const desk = read(DESK);

  assert.match(desk, /CollectionOrdersPanel/);
  assert.match(desk, /CollectionTraitsPanel/);
  assert.match(desk, /CollectionHoldersPanel/);
  assert.match(read("components/trade/collection-orders-panel.tsx"), /role="region"/);
  assert.match(read("components/trade/collection-traits-panel.tsx"), /role="region"/);
  assert.match(read("components/trade/collection-holders-panel.tsx"), /role="region"/);
});

test("M2 collection desk BIDS tab: tensor table shell when empty", () => {
  const desk = read(DESK);
  const panel = read("components/trade/collection-bids-panel.tsx");

  assert.match(desk, /trade-collection-bids-tab/);
  assert.match(desk, /CollectionBidsPanel/);
  assert.match(panel, /overflow-x-auto/);
  assert.match(panel, /No open collection bids/);
  assert.match(panel, /No placeholder rows are shown/);
  assert.match(panel, /Hide trait bids/);
  assert.match(panel, /filterVisibleCollectionBids/);
  assert.doesNotMatch(panel, /if \(feed\.bids\.length === 0\)/);
});
