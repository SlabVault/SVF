import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();

function read(relPath: string) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

test("TensorListingGrid renders instant sell before listing cards", () => {
  const grid = read("components/trade/trade-listing-grid.tsx");
  const tileIdx = grid.indexOf("TradeInstantSellTile");
  const mapIdx = grid.indexOf("listings.map(");

  assert.ok(tileIdx >= 0, "TradeInstantSellTile missing from listing grid");
  assert.ok(mapIdx >= 0, "listings.map missing from listing grid");
  assert.ok(tileIdx < mapIdx, "instant sell tile must precede listing cards");
  assert.match(grid, /floorSol != null && onInstantSell/);
});

test("TradeInstantSellTile exposes sell-now and all-bids CTAs", () => {
  const tile = read("components/trade/trade-instant-sell-tile.tsx");
  assert.match(tile, /Instant sell/);
  assert.match(tile, /SELL NOW/);
  assert.match(tile, /ALL BIDS/);
  assert.match(tile, /trade-instant-sell-price/);
  assert.match(read("app/globals.css"), /trade-instant-sell-tile \.tensor-btn-sweep/);
});

test("collection desk wires instant sell grid cell and modal", () => {
  const desk = read("components/trade/trade-collection-desk-client.tsx");

  assert.match(desk, /const sellNowSol = tensorRibbon\?\.sellNowSol \?\? stats\.floorSol/);
  assert.match(desk, /floorSol=\{sellNowSol\}/);
  assert.match(desk, /onInstantSell=/);
  assert.match(desk, /TradeInstantSellModal/);
  assert.match(desk, /filteredListings\.length > 0 \|\| sellNowSol != null/);
});
