import assert from "node:assert/strict";
import test from "node:test";

import {
  PROXY_API_RATE_LIMIT_AUTH,
  PROXY_API_RATE_LIMIT_DEFAULT,
  PROXY_API_RATE_LIMIT_TRADE_TX,
  isProxyTradeTxApiRoute,
  resolveProxyApiRateLimit,
  resolveProxyRateLimitScope,
} from "../proxy";

const TRADE_TX_PATHS = [
  "/api/trade/tx/buy",
  "/api/trade/tx/list",
  "/api/trade/tx/delist",
  "/api/trade/tx/bid",
  "/api/trade/tx/cancel-bid",
  "/api/trade/tx/challenge",
] as const;

test("resolveProxyApiRateLimit applies stricter cap to /api/trade/tx/* than default API", () => {
  for (const pathname of TRADE_TX_PATHS) {
    const limit = resolveProxyApiRateLimit(pathname);
    assert.equal(limit, PROXY_API_RATE_LIMIT_TRADE_TX);
    assert.ok(
      limit < PROXY_API_RATE_LIMIT_DEFAULT,
      `${pathname} should be stricter than default API (${PROXY_API_RATE_LIMIT_DEFAULT})`,
    );
  }
});

test("resolveProxyApiRateLimit keeps auth and default API tiers", () => {
  assert.equal(resolveProxyApiRateLimit("/api/auth/signin"), PROXY_API_RATE_LIMIT_AUTH);
  assert.equal(resolveProxyApiRateLimit("/api/marketplace/checkout"), PROXY_API_RATE_LIMIT_DEFAULT);
  assert.equal(
    resolveProxyApiRateLimit("/api/trade/collection-listings"),
    PROXY_API_RATE_LIMIT_DEFAULT,
  );
});

test("proxy rate limit constants export auth, trade-tx, and default tiers", () => {
  assert.equal(PROXY_API_RATE_LIMIT_TRADE_TX, PROXY_API_RATE_LIMIT_AUTH);
  assert.ok(PROXY_API_RATE_LIMIT_TRADE_TX < PROXY_API_RATE_LIMIT_DEFAULT);
});

test("resolveProxyRateLimitScope labels /api/trade/tx/* as trade-tx", () => {
  assert.equal(resolveProxyRateLimitScope("/api/trade/tx/buy"), "trade-tx");
  assert.equal(resolveProxyRateLimitScope("/api/auth/signin"), "auth");
  assert.equal(resolveProxyRateLimitScope("/api/trade/collection-listings"), "api");
  assert.equal(resolveProxyRateLimitScope("/api/trade/txfoo"), "api");
});

test("isProxyTradeTxApiRoute matches /api/trade/tx/ only", () => {
  for (const pathname of TRADE_TX_PATHS) {
    assert.equal(isProxyTradeTxApiRoute(pathname), true, pathname);
    assert.equal(resolveProxyApiRateLimit(pathname), PROXY_API_RATE_LIMIT_TRADE_TX);
  }
  assert.equal(isProxyTradeTxApiRoute("/api/trade/collection-listings"), false);
  assert.equal(isProxyTradeTxApiRoute("/api/trade/txfoo"), false);
  assert.equal(resolveProxyApiRateLimit("/api/trade/txfoo"), PROXY_API_RATE_LIMIT_DEFAULT);
});
