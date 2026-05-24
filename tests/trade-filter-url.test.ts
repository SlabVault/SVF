import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildTradeFilterSearchParams,
  DEFAULT_TRADE_FILTERS,
  isDefaultTradeFilters,
  parseTradeFiltersFromSearchParams,
} from "@/lib/trade/trade-filter-url";

test("parseTradeFiltersFromSearchParams reads set param", () => {
  const params = new URLSearchParams("set=Obsidian+Flames&grade=PSA+10");
  const filters = parseTradeFiltersFromSearchParams(params);
  assert.equal(filters.setQuery, "Obsidian Flames");
  assert.deepEqual(filters.grades, ["PSA 10"]);
});

test("buildTradeFilterSearchParams writes set param", () => {
  const params = buildTradeFilterSearchParams({
    ...DEFAULT_TRADE_FILTERS,
    setQuery: "Scarlet & Violet",
  });
  assert.equal(params.get("set"), "Scarlet & Violet");
});

test("isDefaultTradeFilters treats set query as active filter", () => {
  assert.equal(isDefaultTradeFilters(DEFAULT_TRADE_FILTERS), true);
  assert.equal(
    isDefaultTradeFilters({ ...DEFAULT_TRADE_FILTERS, setQuery: "Promo" }),
    false,
  );
  assert.equal(
    isDefaultTradeFilters({ ...DEFAULT_TRADE_FILTERS, partners: ["phygitals"] }),
    false,
  );
});
