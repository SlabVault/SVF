import assert from "node:assert/strict";
import test from "node:test";

import { POST as adminPricingPost } from "../app/api/admin/pricing/route";
import { prisma } from "../lib/prisma";
import {
  schemaHealthNonBlockingQueryResults,
  withMockedQueryRaw,
} from "./helpers/prisma-test-utils";
import { apiWriteRequest, withPatchedMethod, withTemporaryEnv } from "./helpers/test-helpers";

test("admin pricing requires auth bearer token", async () => {
  await withTemporaryEnv({ ADMIN_PASSWORD: "secret" }, async () => {
    const request = apiWriteRequest("http://localhost/api/admin/pricing", {
      method: "POST",
      body: JSON.stringify({ slabId: "slab_1", solPrice: 1, svfPrice: 2 }),
    });
    const response = await adminPricingPost(request);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.code, "ADMIN_AUTH_UNAUTHORIZED");
  });
});

test("admin pricing rejects missing slabId", async () => {
  await withTemporaryEnv(
    {
      ADMIN_PASSWORD: "secret",
      DATABASE_URL: "postgresql://example",
    },
    async () => {
      const request = apiWriteRequest("http://localhost/api/admin/pricing", {
        method: "POST",
        headers: { authorization: "Bearer secret" },
        body: JSON.stringify({ solPrice: 1, svfPrice: 2 }),
      });

      const response = await withMockedQueryRaw(
        schemaHealthNonBlockingQueryResults(),
        async () => adminPricingPost(request),
      );
      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.code, "ADMIN_PRICING_INVALID_SLAB_ID");
    },
  );
});

test("admin pricing updates slab and records history", async () => {
  const prismaSlab = prisma.slab as unknown as {
    update: (...args: unknown[]) => Promise<unknown>;
  };
  const prismaHistory = prisma.pricingHistory as unknown as {
    create: (...args: unknown[]) => Promise<unknown>;
  };

  await withTemporaryEnv(
    {
      ADMIN_PASSWORD: "secret",
      DATABASE_URL: "postgresql://example",
    },
    async () => {
      await withPatchedMethod(
        prismaSlab,
        "update",
        async () => ({
          id: "slab_1",
          solPrice: 1.5,
          svfPrice: 250,
        }),
        async () =>
          withPatchedMethod(
            prismaHistory,
            "create",
            async () => ({ id: "history_1" }),
            async () => {
              const request = apiWriteRequest("http://localhost/api/admin/pricing", {
                method: "POST",
                headers: { authorization: "Bearer secret" },
                body: JSON.stringify({
                  slabId: "slab_1",
                  solPrice: 1.5,
                  svfPrice: 250,
                }),
              });

              const response = await withMockedQueryRaw(
                schemaHealthNonBlockingQueryResults(),
                async () => adminPricingPost(request),
              );
              const body = await response.json();

              assert.equal(response.status, 200);
              assert.equal(body.id, "slab_1");
              assert.equal(body.solPrice, 1.5);
              assert.equal(body.svfPrice, 250);
            },
          ),
      );
    },
  );
});
