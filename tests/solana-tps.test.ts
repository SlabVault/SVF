import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { fetchSolanaTps, formatSolanaTpsLabel } from "@/lib/trade/solana-tps";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("formatSolanaTpsLabel shows approximate TPS or honest fallback", () => {
  assert.equal(formatSolanaTpsLabel(2847), "~2,800");
  assert.equal(formatSolanaTpsLabel(3120), "~3,100");
  assert.equal(formatSolanaTpsLabel(156), "~160");
  assert.equal(formatSolanaTpsLabel(42), "~42");
  assert.equal(formatSolanaTpsLabel(null), "—");
  assert.equal(formatSolanaTpsLabel(0), "—");
});

test("fetchSolanaTps parses getRecentPerformanceSamples response", async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: [{ numTransactions: 180_000, samplePeriodSecs: 60, numSlots: 150, slot: 1 }],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  const tps = await fetchSolanaTps("https://rpc.example.test");
  assert.equal(tps, 3000);
});

test("fetchSolanaTps returns null on RPC error", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code: -32000 } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  const tps = await fetchSolanaTps("https://rpc.example.test");
  assert.equal(tps, null);
});
