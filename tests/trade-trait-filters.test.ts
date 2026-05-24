import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import {
  buildTradeFilterSearchParams,
  parseTradeFiltersFromSearchParams,
} from "@/lib/trade/trade-filter-url";
import { DEFAULT_TRADE_FILTERS } from "@/lib/trade-listings";

const ROOT = process.cwd();
const FILTERS_SOURCE = "components/trade/trade-trait-filters.tsx";

function read(relPath: string) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

test("trade trait filters patch URL params without dropping sibling keys", () => {
  const params = new URLSearchParams(
    "grader=PSA,BGS&grade=PSA%2010&min=1.5&max=9&q=charizard&set=Obsidian",
  );
  const parsed = parseTradeFiltersFromSearchParams(params);

  const afterSetToggle = {
    ...parsed,
    setQuery: "Base Set",
  };
  const rebuilt = buildTradeFilterSearchParams(afterSetToggle);

  assert.deepEqual(afterSetToggle.graders, ["PSA", "BGS"]);
  assert.deepEqual(afterSetToggle.grades, ["PSA 10"]);
  assert.equal(afterSetToggle.minAskSol, 1.5);
  assert.equal(afterSetToggle.maxAskSol, 9);
  assert.equal(afterSetToggle.searchQuery, "charizard");
  assert.equal(rebuilt.get("grader"), "PSA,BGS");
  assert.equal(rebuilt.get("grade"), "PSA%2010");
  assert.equal(rebuilt.get("min"), "1.5");
  assert.equal(rebuilt.get("max"), "9");
  assert.equal(rebuilt.get("q"), "charizard");
  assert.equal(rebuilt.get("set"), "Base Set");
});

test("trade trait filters component uses functional onFiltersChange updates", () => {
  const source = read(FILTERS_SOURCE);

  assert.match(source, /onFiltersChange: Dispatch<SetStateAction<TradeTraitFilters>>/);
  assert.match(source, /onFiltersChange\(\(current\) =>/);
  assert.match(source, /parseSolFilterInput/);
  assert.match(source, /resetFilters[\s\S]*onFiltersChange\(\(current\) =>/);
  assert.match(source, /setQuery: selected \? "" : setName/);
  assert.doesNotMatch(
    source,
    /onFiltersChange\(\{\s*\.\.\.filters,\s*setQuery:/,
  );
});

test("trade trait filters set section has honest empty state", () => {
  const source = read(FILTERS_SOURCE);

  assert.match(source, /Set names appear when listings include set metadata/);
  assert.match(source, /filters\.setQuery/);
  assert.match(source, /toggleGrader/);
});

test("parseTradeFiltersFromSearchParams reads full slab filter URL", () => {
  const filters = parseTradeFiltersFromSearchParams(
    new URLSearchParams("grader=psa&grade=BGS%209.5&min=0.25&max=100&q=pikachu"),
  );

  assert.deepEqual(filters.graders, ["PSA"]);
  assert.deepEqual(filters.grades, ["BGS 9.5"]);
  assert.equal(filters.minAskSol, 0.25);
  assert.equal(filters.maxAskSol, 100);
  assert.equal(filters.searchQuery, "pikachu");
  assert.equal(filters.setQuery, "");
});

test("buildTradeFilterSearchParams omits default empty filter fields", () => {
  const params = buildTradeFilterSearchParams(DEFAULT_TRADE_FILTERS);
  assert.equal(params.toString(), "");
});
