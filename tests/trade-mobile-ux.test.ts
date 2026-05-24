import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  TRADE_GRID_CLASS,
  TRADE_GRID_DENSITY_CLASS,
} from "@/lib/trade/grid-density";

const ROOT = process.cwd();

function read(relPath: string) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

test("TC-111: TradeFilterDrawer replaces inline mobile filters", () => {
  const drawer = read("components/trade/trade-filter-drawer.tsx");
  const desk = read("components/trade/trade-collection-desk-client.tsx");
  const shell = read("components/trade/tensor/collection-desk-layout.tsx");

  assert.match(drawer, /export function TradeFilterDrawer/);
  assert.match(drawer, /role="dialog"/);
  assert.match(drawer, /md:hidden/);
  assert.match(desk, /TradeFilterDrawer/);
  assert.doesNotMatch(desk, /mb-3 md:hidden[\s\S]*TradeTraitFilters/);
  assert.match(shell, /hidden min-h-0 w-\[14rem\][\s\S]*md:flex/);
});

test("TC-112: collection nav horizontal scroll strip on mobile", () => {
  const nav = read("components/trade/trade-collection-nav.tsx");
  const shell = read("components/trade/tensor/collection-desk-layout.tsx");

  assert.match(nav, /trade-collection-strip/);
  assert.match(nav, /overflow-x-auto/);
  assert.match(nav, /snap-x snap-mandatory/);
  assert.match(shell, /variant="horizontal"/);
  assert.match(shell, /className="lg:hidden"/);
});

test("TC-113: TradeMobileActionBar sticky buy/sell on item page", () => {
  const bar = read("components/trade/trade-mobile-action-bar.tsx");
  const item = read("components/trade/trade-item-detail-client.tsx");

  assert.match(bar, /export function TradeMobileActionBar/);
  assert.match(bar, /fixed inset-x-0 bottom-0/);
  assert.match(bar, /aria-label="Trade mode"/);
  assert.match(bar, /md:hidden/);
  assert.match(item, /TradeMobileActionBar/);
  assert.match(item, /pb-28 md:pb-/);
  assert.match(item, /ItemNavArrows/);
});

test("TC-114: 2-column listing grid default on mobile", () => {
  assert.match(TRADE_GRID_CLASS, /grid-cols-2/);
  assert.match(TRADE_GRID_CLASS, /sm:grid-cols-3/);

  const grid = read("components/trade/trade-listing-grid.tsx");
  assert.match(grid, /TRADE_GRID_DENSITY_CLASS/);
  assert.match(grid, /@\/lib\/trade\/grid-density/);
});

test("TC-114b: grid density s/m/l maps to 5–6 xl columns (Tensor)", () => {
  assert.match(TRADE_GRID_DENSITY_CLASS.m, /xl:grid-cols-5/);
  assert.match(TRADE_GRID_DENSITY_CLASS.s, /xl:grid-cols-6/);
  assert.match(TRADE_GRID_DENSITY_CLASS.l, /xl:grid-cols-4/);
  assert.doesNotMatch(TRADE_GRID_DENSITY_CLASS.m, /xl:grid-cols-6/);
});

test("TC-115: M2 pro layout trade panel left column on xl", () => {
  const layout = read("components/trade/tensor/collection-desk-layout.tsx");
  const desk = read("components/trade/trade-collection-desk-client.tsx");

  assert.match(layout, /tradePanel/);
  assert.match(layout, /xl:flex/);
  assert.match(desk, /TensorTradePanel/);
});

test("TC-116: listing tiles rank badge + tighter card padding", () => {
  const card = read("components/trade/tensor/nft-card.tsx");
  const css = read("app/globals.css");
  assert.match(card, /#\{rank\}/);
  assert.match(card, /justify-between/);
  assert.match(css, /padding: 8px/);
});
