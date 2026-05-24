import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { GET as collectionDepthGet } from "../app/api/trade/collections/[slug]/depth/route";
import { withTemporaryEnv } from "./helpers/test-helpers";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = originalFetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("trade collection depth GET returns 404 for unknown slug", async () => {
  const request = new Request("http://localhost/api/trade/collections/unknown-set/depth");
  const response = await collectionDepthGet(request, {
    params: Promise.resolve({ slug: "unknown-set" }),
  });
  const body = (await response.json()) as { error?: string };

  assert.equal(response.status, 404);
  assert.equal(body.error, "Collection not found");
});

test("trade collection depth GET rejects treasury slug", async () => {
  const request = new Request(
    "http://localhost/api/trade/collections/slabvault-treasury/depth",
  );
  const response = await collectionDepthGet(request, {
    params: Promise.resolve({ slug: "slabvault-treasury" }),
  });
  const body = (await response.json()) as { error?: string };

  assert.equal(response.status, 400);
  assert.match(body.error ?? "", /Treasury depth/i);
});

test("trade collection depth GET returns partner ingest depth without Tensor key", async () => {
  await withTemporaryEnv(
    {
      TENSOR_API_KEY: undefined,
      TENSOR_CC_COLLECTION_SLUGS: undefined,
    },
    async () => {
      const request = new Request(
        "http://localhost/api/trade/collections/collector-crypt/depth",
      );
      const response = await collectionDepthGet(request, {
        params: Promise.resolve({ slug: "collector-crypt" }),
      });
      const body = (await response.json()) as {
        source: string;
        readConfigured: boolean;
        listings: Array<{ collectionId: string; askSol: number }>;
        stats: { listedCount: number };
      };

      assert.equal(response.status, 200);
      assert.equal(body.source, "partner_ingest");
      assert.equal(body.readConfigured, true);
      assert.ok(body.listings.length >= 1);
      assert.equal(body.listings[0]?.collectionId, "collector-crypt");
      assert.ok(body.stats.listedCount >= 1);
      assert.equal(response.headers.get("X-Trade-Depth-Source"), "partner_ingest");
      assert.equal(response.headers.get("X-Trade-Depth-Configured"), "true");
      assert.match(response.headers.get("Cache-Control") ?? "", /s-maxage=60/);
    },
  );
});

test("trade collection depth GET returns phygitals partner ingest without Tensor key", async () => {
  await withTemporaryEnv(
    {
      TENSOR_API_KEY: undefined,
    },
    async () => {
      const request = new Request(
        "http://localhost/api/trade/collections/phygitals/depth",
      );
      const response = await collectionDepthGet(request, {
        params: Promise.resolve({ slug: "phygitals" }),
      });
      const body = (await response.json()) as {
        source: string;
        listings: unknown[];
      };

      assert.equal(response.status, 200);
      assert.equal(body.source, "partner_ingest");
      assert.ok(body.listings.length >= 1);
    },
  );
});

test("trade collection depth GET maps Tensor listings when keyed and no partner ingest", async () => {
  await withTemporaryEnv(
    {
      TENSOR_API_KEY: "test-key",
      TENSOR_API_BASE_URL: "https://api.example.test",
      TENSOR_CC_COLLECTION_SLUGS: "magic_eden_slabs",
    },
    async () => {
      let callCount = 0;
      globalThis.fetch = async (input) => {
        callCount += 1;
        const url = String(input);

        if (url.includes("/api/v1/collections")) {
          return new Response(
            JSON.stringify({
              collections: [
                {
                  collId: "abc",
                  slug: "magic_eden_slabs",
                  slugDisplay: "magic_eden_slabs",
                  name: "Magic Eden Slabs",
                  statsV2: { numListed: 2, buyNowPrice: 2_000_000_000 },
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }

        if (url.includes("/api/v1/mint/collection")) {
          return new Response(
            JSON.stringify({
              mints: [
                {
                  mint: "Mint1111111111111111111111111111111111111",
                  name: "Charizard",
                  imageUri: "https://img.example/a.png",
                  listing: { price: 1_500_000_000 },
                  attributes: [{ trait_type: "Grade", value: "PSA 10" }],
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }

        return new Response("not found", { status: 404 });
      };

      const request = new Request(
        "http://localhost/api/trade/collections/magic-eden/depth",
      );
      const response = await collectionDepthGet(request, {
        params: Promise.resolve({ slug: "magic-eden" }),
      });
      const body = (await response.json()) as {
        source: string;
        readConfigured: boolean;
        tensorSlug: string | null;
        listings: Array<{ askSol: number; collectionId: string; grade: string }>;
        stats: { listedCount: number; floorSol: number | null };
      };

      assert.equal(response.status, 200);
      assert.equal(body.source, "tensor_api");
      assert.equal(body.readConfigured, true);
      assert.equal(body.listings.length, 1);
      assert.equal(body.listings[0]?.askSol, 1.5);
      assert.equal(body.listings[0]?.collectionId, "magic-eden");
      assert.equal(body.listings[0]?.grade, "PSA 10");
      assert.equal(body.stats.listedCount, 2);
      assert.equal(body.stats.floorSol, 2);
      assert.equal(response.headers.get("X-Trade-Depth-Source"), "tensor_api");
      assert.equal(response.headers.get("X-Trade-Depth-Configured"), "true");
      assert.ok(callCount >= 2);
    },
  );
});

test("trade collection depth GET returns 503 when Tensor API errors and no partner ingest", async () => {
  await withTemporaryEnv(
    {
      TENSOR_API_KEY: "test-key",
      TENSOR_API_BASE_URL: "https://api.example.test",
      TENSOR_CC_COLLECTION_SLUGS: "magic_eden_slabs",
    },
    async () => {
      globalThis.fetch = async () =>
        new Response("upstream down", { status: 502 });

      const request = new Request(
        "http://localhost/api/trade/collections/magic-eden/depth",
      );
      const response = await collectionDepthGet(request, {
        params: Promise.resolve({ slug: "magic-eden" }),
      });
      const body = (await response.json()) as {
        error: string;
        message: string;
        depth: { readConfigured: boolean; listings: unknown[] };
      };

      assert.equal(response.status, 503);
      assert.equal(body.error, "Collection depth unavailable");
      assert.match(body.message, /502/);
      assert.equal(body.depth.readConfigured, true);
      assert.deepEqual(body.depth.listings, []);
    },
  );
});
