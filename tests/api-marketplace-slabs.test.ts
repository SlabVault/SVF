import assert from "node:assert/strict";
import test from "node:test";

import { GET as slabsListGet, POST as slabsPost } from "../app/api/marketplace/slabs/route";
import {
  GET as slabByIdGet,
  PATCH as slabByIdPatch,
} from "../app/api/marketplace/slabs/[id]/route";
import { prisma } from "../lib/prisma";
import { withMockedQueryRaw } from "./helpers/prisma-test-utils";
import { apiWriteRequest, withPatchedMethod, withTemporaryEnv } from "./helpers/test-helpers";

test("marketplace slabs GET serves fallback listings when database is unconfigured", async () => {
  await withTemporaryEnv({ DATABASE_URL: undefined }, async () => {
    const request = new Request("http://localhost/api/marketplace/slabs");
    const response = await slabsListGet(request);
    const body = (await response.json()) as Array<Record<string, unknown>>;

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body));
    assert.equal(response.headers.get("X-Marketplace-Source"), "data/slabs.json");
    assert.equal(response.headers.get("X-Marketplace-Db-Status"), "unconfigured");
  });
});

test("marketplace slabs GET forwards filter query params to listing layer", async () => {
  const prismaSlab = prisma.slab as unknown as {
    findMany: (...args: unknown[]) => Promise<unknown[]>;
  };

  await withTemporaryEnv({ DATABASE_URL: "postgresql://example" }, async () => {
    await withMockedQueryRaw([[{ ok: 1 }]], async () => {
      await withPatchedMethod(
        prismaSlab,
        "findMany",
        async (options: { where?: Record<string, unknown> }) => {
          assert.equal(options.where?.status, "AVAILABLE");
          assert.equal(options.where?.grade, "PSA 10");
          assert.deepEqual(options.where?.solPrice, { gte: 1, lte: 5 });
          return [
            {
              id: "slab_1",
              name: "Charizard",
              grade: "PSA 10",
              estimatedValueUsd: 900,
              acquiredAt: new Date("2026-01-01T00:00:00.000Z"),
              imageUrl: "https://example.com/slab.png",
              vaultedUrl: "https://vaulted.id/slab",
              collectrUrl: null,
              status: "AVAILABLE",
              solPrice: 2,
              svfPrice: 500,
            },
          ];
        },
        async () => {
          const request = new Request(
            "http://localhost/api/marketplace/slabs?status=AVAILABLE&grade=PSA%2010&minPrice=1&maxPrice=5",
          );
          const response = await slabsListGet(request);
          const body = (await response.json()) as Array<Record<string, unknown>>;

          assert.equal(response.status, 200);
          assert.equal(body.length, 1);
          assert.equal(body[0].id, "slab_1");
          assert.equal(response.headers.get("X-Marketplace-Db-Status"), "connected");
          assert.equal(response.headers.get("X-Marketplace-Source"), null);
        },
      );
    });
  });
});

test("marketplace slab GET returns 404 for unknown ids", async () => {
  await withTemporaryEnv({ DATABASE_URL: undefined }, async () => {
    const request = new Request(
      "http://localhost/api/marketplace/slabs/does-not-exist-xyz",
    );
    const response = await slabByIdGet(request, {
      params: Promise.resolve({ id: "does-not-exist-xyz" }),
    });
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.error, "Slab not found");
  });
});

test("marketplace slab GET returns serialized slab from database", async () => {
  const prismaSlab = prisma.slab as unknown as {
    findUnique: (...args: unknown[]) => Promise<unknown>;
  };

  await withTemporaryEnv({ DATABASE_URL: "postgresql://example" }, async () => {
    await withPatchedMethod(
      prismaSlab,
      "findUnique",
      async () => ({
        id: "slab_1",
        name: "Base Set Charizard",
        grade: "PSA 9",
        estimatedValueUsd: 800,
        acquiredAt: new Date("2026-01-01T00:00:00.000Z"),
        imageUrl: "https://example.com/slab.png",
        vaultedUrl: "https://vaulted.id/slab",
        collectrUrl: null,
        status: "AVAILABLE",
        solPrice: 1.5,
        svfPrice: 400,
        pricingHistory: [],
      }),
      async () => {
        const request = new Request("http://localhost/api/marketplace/slabs/slab_1");
        const response = await slabByIdGet(request, {
          params: Promise.resolve({ id: "slab_1" }),
        });
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.id, "slab_1");
        assert.equal(body.solPrice, 1.5);
        assert.equal(body.svfPrice, 400);
      },
    );
  });
});

test("marketplace slabs POST requires admin auth", async () => {
  await withTemporaryEnv({ ADMIN_PASSWORD: "secret" }, async () => {
    const request = apiWriteRequest("http://localhost/api/marketplace/slabs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Test Slab" }),
    });
    const response = await slabsPost(request);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.code, "ADMIN_AUTH_UNAUTHORIZED");
  });
});

test("marketplace slab PATCH requires admin auth", async () => {
  await withTemporaryEnv({ ADMIN_PASSWORD: "secret" }, async () => {
    const request = apiWriteRequest("http://localhost/api/marketplace/slabs/slab_1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ solPrice: 2 }),
    });
    const response = await slabByIdPatch(request, {
      params: Promise.resolve({ id: "slab_1" }),
    });
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.code, "ADMIN_AUTH_UNAUTHORIZED");
  });
});
