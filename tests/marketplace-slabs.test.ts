import assert from "node:assert/strict";
import test from "node:test";

import { listMarketplaceSlabs } from "@/lib/marketplace-slabs";
import { resetDatabaseStatusCache } from "@/lib/db-connection";
import { withTemporaryEnv } from "./helpers/test-helpers";

test("listMarketplaceSlabs falls back to data/slabs.json when DATABASE_URL is unset", async () => {
  await withTemporaryEnv({ DATABASE_URL: undefined }, async () => {
    resetDatabaseStatusCache();
    const result = await listMarketplaceSlabs({ status: "AVAILABLE" });

    assert.equal(result.fromFallback, true);
    assert.equal(result.dbStatus, "unconfigured");
    assert.ok(result.slabs.length > 0);
    assert.equal(result.slabs[0]?.fallbackSource, "data/slabs.json");
  });
});

test("listMarketplaceSlabs falls back to JSON when database probe is unreachable", async () => {
  const dbConnection = await import("@/lib/db-connection");
  const originalGetDatabaseStatus = dbConnection.getDatabaseStatus;

  await withTemporaryEnv(
    { DATABASE_URL: "postgresql://invalid:5432/test" },
    async () => {
      dbConnection.getDatabaseStatus = async () => ({
        state: "unreachable",
        hint: "test unreachable",
        detail: "fetch failed",
      });

      try {
        resetDatabaseStatusCache();
        const result = await listMarketplaceSlabs({ status: "AVAILABLE" });

        assert.equal(result.fromFallback, true);
        assert.equal(result.dbStatus, "unreachable");
        assert.ok(result.slabs.length > 0);
      } finally {
        dbConnection.getDatabaseStatus = originalGetDatabaseStatus;
        resetDatabaseStatusCache();
      }
    },
  );
});

test("listMarketplaceSlabs probes prisma+postgres URL in development", async () => {
  const dbConnection = await import("@/lib/db-connection");

  await withTemporaryEnv(
    {
      DATABASE_URL: "prisma+postgres://localhost:51213/dev?api_key=abc",
      NODE_ENV: "development",
    },
    async () => {
      dbConnection.setDatabaseStatusProbeForTests(async () => ({
        state: "unreachable",
        hint: "Prisma dev server not running",
        detail: "fetch failed",
        reason: "prisma_dev_unavailable",
      }));

      try {
        resetDatabaseStatusCache();
        const result = await listMarketplaceSlabs({ status: "AVAILABLE" });

        assert.equal(result.fromFallback, true);
        assert.equal(result.dbStatus, "unreachable");
        assert.ok(result.slabs.length > 0);
        assert.equal(result.slabs[0]?.fallbackSource, "data/slabs.json");
      } finally {
        dbConnection.setDatabaseStatusProbeForTests(null);
        resetDatabaseStatusCache();
      }
    },
  );
});
