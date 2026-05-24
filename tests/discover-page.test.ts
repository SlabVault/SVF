import assert from "node:assert/strict";
import test from "node:test";

import { getExternalListingSeedStats } from "../lib/external-listings";
import { isDiscoverAggregatorEnabled } from "../lib/discover-config";

test("getExternalListingSeedStats reports active and stale counts", () => {
  const stats = getExternalListingSeedStats();
  assert.ok(stats.activeCount >= 0);
  assert.ok(stats.staleCount >= 0);
  assert.ok(stats.activeCount >= stats.staleCount);
  assert.equal(typeof stats.newestIndexedAt, "string");
});

test("isDiscoverAggregatorEnabled is permanently off (discover lane archived)", () => {
  const previousFlag = process.env.DISCOVER_AGGREGATOR_ENABLED;
  const previousNodeEnv = process.env.NODE_ENV;

  process.env.DISCOVER_AGGREGATOR_ENABLED = "true";
  process.env.NODE_ENV = "development";
  assert.equal(isDiscoverAggregatorEnabled(), false);

  delete process.env.DISCOVER_AGGREGATOR_ENABLED;
  process.env.NODE_ENV = "production";
  assert.equal(isDiscoverAggregatorEnabled(), false);

  if (previousFlag === undefined) {
    delete process.env.DISCOVER_AGGREGATOR_ENABLED;
  } else {
    process.env.DISCOVER_AGGREGATOR_ENABLED = previousFlag;
  }

  if (previousNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = previousNodeEnv;
  }
});
