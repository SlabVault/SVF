import assert from "node:assert/strict";
import test from "node:test";

import { GET as activityGet } from "../app/api/trade/activity/route";
import { withTemporaryEnv } from "./helpers/test-helpers";

test("trade activity GET requires collection query param", async () => {
  const response = await activityGet(new Request("http://localhost/api/trade/activity"));
  const body = (await response.json()) as { error?: string };

  assert.equal(response.status, 400);
  assert.match(body.error ?? "", /collection/i);
});

test("trade activity GET returns synthetic feed for treasury without Tensor key", async () => {
  await withTemporaryEnv({ TENSOR_API_KEY: undefined, DATABASE_URL: undefined }, async () => {
    const response = await activityGet(
      new Request("http://localhost/api/trade/activity?collection=slabvault-treasury"),
    );
    const body = (await response.json()) as {
      source: string;
      events: unknown[];
    };

    assert.equal(response.status, 200);
    assert.equal(body.source, "synthetic");
    assert.ok(Array.isArray(body.events));
    assert.equal(response.headers.get("X-Trade-Activity-Source"), "synthetic");
  });
});

test("trade activity GET returns 400-ish payload for unknown collection slug", async () => {
  await withTemporaryEnv({ TENSOR_API_KEY: undefined }, async () => {
    const response = await activityGet(
      new Request("http://localhost/api/trade/activity?collection=not-a-real-collection"),
    );
    const body = (await response.json()) as { source: string; events: unknown[] };

    assert.equal(response.status, 200);
    assert.equal(body.source, "unconfigured");
    assert.deepEqual(body.events, []);
  });
});
