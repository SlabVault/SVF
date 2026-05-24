import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { isRwaTradeEnabled } from "@/lib/trade-config";

const previousTradePlatform = process.env.TRADE_PLATFORM_ENABLED;
const previousRwaTrade = process.env.RWA_TRADE_ENABLED;
const previousNodeEnv = process.env.NODE_ENV;

function resetEnv() {
  if (previousTradePlatform === undefined) {
    delete process.env.TRADE_PLATFORM_ENABLED;
  } else {
    process.env.TRADE_PLATFORM_ENABLED = previousTradePlatform;
  }

  if (previousRwaTrade === undefined) {
    delete process.env.RWA_TRADE_ENABLED;
  } else {
    process.env.RWA_TRADE_ENABLED = previousRwaTrade;
  }

  process.env.NODE_ENV = previousNodeEnv;
}

beforeEach(() => {
  delete process.env.TRADE_PLATFORM_ENABLED;
  delete process.env.RWA_TRADE_ENABLED;
  process.env.NODE_ENV = "production";
});

afterEach(resetEnv);

test("isRwaTradeEnabled is off in production when unset", () => {
  assert.equal(isRwaTradeEnabled(), false);
});

test("isRwaTradeEnabled defaults on in non-production when unset", () => {
  process.env.NODE_ENV = "development";
  assert.equal(isRwaTradeEnabled(), true);
});

test("isRwaTradeEnabled respects TRADE_PLATFORM_ENABLED", () => {
  process.env.TRADE_PLATFORM_ENABLED = "true";
  assert.equal(isRwaTradeEnabled(), true);

  process.env.TRADE_PLATFORM_ENABLED = "false";
  assert.equal(isRwaTradeEnabled(), false);
});

test("isRwaTradeEnabled falls back to RWA_TRADE_ENABLED alias", () => {
  process.env.RWA_TRADE_ENABLED = "true";
  assert.equal(isRwaTradeEnabled(), true);
});

test("TRADE_PLATFORM_ENABLED takes precedence over RWA_TRADE_ENABLED", () => {
  process.env.TRADE_PLATFORM_ENABLED = "false";
  process.env.RWA_TRADE_ENABLED = "true";
  assert.equal(isRwaTradeEnabled(), false);
});
