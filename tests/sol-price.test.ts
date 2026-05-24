import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { fetchSolUsdPrice, formatSolUsdTicker } from "@/lib/sol-price";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("formatSolUsdTicker shows price or honest fallback", () => {
  assert.equal(formatSolUsdTicker(142.567), "SOL $142.57");
  assert.equal(formatSolUsdTicker(null), "SOL —");
  assert.equal(formatSolUsdTicker(0), "SOL —");
});

test("fetchSolUsdPrice parses CoinGecko simple price response", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ solana: { usd: 198.12 } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  const price = await fetchSolUsdPrice();
  assert.equal(price, 198.12);
});

test("fetchSolUsdPrice returns null on API error", async () => {
  globalThis.fetch = async () => new Response("error", { status: 500 });

  const price = await fetchSolUsdPrice();
  assert.equal(price, null);
});
