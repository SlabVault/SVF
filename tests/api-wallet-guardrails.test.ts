import assert from "node:assert/strict";
import test from "node:test";

import { POST as reservePost } from "../app/api/marketplace/reserve/route";
import { GET as reserveChallengeGet } from "../app/api/marketplace/reserve/challenge/route";
import { apiWriteRequest, withTemporaryEnv } from "./helpers/test-helpers";

test("reserve route rejects missing required fields", async () => {
  await withTemporaryEnv({ RESERVE_REQUIRE_WALLET_CHALLENGE: "false" }, async () => {
    const request = apiWriteRequest("http://localhost/api/marketplace/reserve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slabId: "slab_1" }),
    });

    const response = await reservePost(request);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.code, "RESERVE_REQUIRED_FIELDS_MISSING");
  });
});

test("reserve route rejects invalid wallet before database checks", async () => {
  await withTemporaryEnv(
    {
      DATABASE_URL: undefined,
      RESERVE_REQUIRE_WALLET_CHALLENGE: "false",
    },
    async () => {
    const request = apiWriteRequest("http://localhost/api/marketplace/reserve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slabId: "slab_1",
        buyerWallet: "not_a_wallet",
      }),
    });
    const response = await reservePost(request);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.code, "RESERVE_INVALID_BUYER_WALLET");
    assert.match(String(body.error), /invalid buyer wallet/i);
    },
  );
});

test("reserve challenge route issues challenge for valid wallet", async () => {
  const request = new Request(
    "http://localhost/api/marketplace/reserve/challenge?buyerWallet=2oRZe7z9Jx3rpoUWuidjGhpX9mxxhtps2JqQtdxLfHwg",
  );
  const response = await reserveChallengeGet(request);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(typeof body.challengeId, "string");
  assert.match(String(body.message), /SlabVaultFi reserve/);
});

test("reserve route requires wallet challenge when enabled", async () => {
  await withTemporaryEnv(
    {
      DATABASE_URL: "postgresql://example",
      RESERVE_REQUIRE_WALLET_CHALLENGE: "true",
    },
    async () => {
      const request = apiWriteRequest("http://localhost/api/marketplace/reserve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slabId: "slab_1",
          buyerWallet: "2oRZe7z9Jx3rpoUWuidjGhpX9mxxhtps2JqQtdxLfHwg",
        }),
      });

      const response = await reservePost(request);
      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.code, "RESERVE_WALLET_CHALLENGE_REQUIRED");
    },
  );
});
