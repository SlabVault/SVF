import assert from "node:assert/strict";
import test from "node:test";

import { GET as syncGet, POST as syncPost } from "../app/api/sync/route";
import { POST as cronExpirePost } from "../app/api/cron/expire-reservations/route";
import { prisma } from "../lib/prisma";
import {
  schemaHealthBlockingQueryResults,
  schemaHealthNonBlockingQueryResults,
  withMockedQueryRaw,
} from "./helpers/prisma-test-utils";
import { withPatchedMethod, withTemporaryEnv } from "./helpers/test-helpers";
import { inspectSchemaHealth, resetSchemaHealthCache } from "../lib/schema-health";

async function primeSchemaHealth(results: unknown[]) {
  resetSchemaHealthCache();
  await withMockedQueryRaw(results, async () => {
    await inspectSchemaHealth({ forceRefresh: true });
  });
}

test("cron expire-reservations returns not-configured envelope", async () => {
  await withTemporaryEnv({ CRON_SECRET: undefined }, async () => {
    const request = new Request("http://localhost/api/cron/expire-reservations", {
      method: "POST",
    });
    const response = await cronExpirePost(request);
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(body.ok, false);
    assert.equal(body.code, "CRON_AUTH_NOT_CONFIGURED");
  });
});

test("sync GET returns not-configured envelope when auth secrets missing", async () => {
  await withTemporaryEnv(
    {
      CRON_SECRET: undefined,
      SYNC_API_TOKEN: undefined,
      ADMIN_PASSWORD: undefined,
      NEXTAUTH_SECRET: undefined,
    },
    async () => {
      const request = new Request("http://localhost/api/sync");
      const response = await syncGet(request);
      const body = await response.json();

      assert.equal(response.status, 503);
      assert.equal(body.ok, false);
      assert.equal(body.code, "SYNC_AUTH_NOT_CONFIGURED");
    },
  );
});

test("sync GET returns structured unauthorized envelope with bearer challenge", async () => {
  await withTemporaryEnv({ CRON_SECRET: "cron-secret" }, async () => {
    const request = new Request("http://localhost/api/sync");
    const response = await syncGet(request);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.ok, false);
    assert.equal(body.code, "SYNC_UNAUTHORIZED");
    assert.equal(body.error, "Unauthorized");
    assert.equal(typeof body.requestId, "string");
    assert.match(String(response.headers.get("www-authenticate")), /bearer/i);
  });
});

test("sync POST returns 401 without bearer secret", async () => {
  await withTemporaryEnv({ CRON_SECRET: "cron-secret" }, async () => {
    const request = new Request("http://localhost/api/sync", { method: "POST" });
    const response = await syncPost(request);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.ok, false);
    assert.equal(body.code, "SYNC_UNAUTHORIZED");
    assert.equal(body.error, "Unauthorized");
    assert.equal(typeof body.requestId, "string");
    assert.match(String(response.headers.get("www-authenticate")), /bearer/i);
  });
});

test("sync GET returns status for authorized bearer token", async () => {
  await withTemporaryEnv({ CRON_SECRET: "cron-secret" }, async () => {
    const request = new Request("http://localhost/api/sync", {
      headers: { authorization: "Bearer cron-secret" },
    });
    const response = await syncGet(request);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.ok("lastSync" in body);
    assert.ok(Array.isArray(body.sourceStatuses));
    assert.ok(Array.isArray(body.operatorHints));
  });
});

test("cron expire-reservations returns structured unauthorized envelope", async () => {
  await withTemporaryEnv({ CRON_SECRET: "cron-secret" }, async () => {
    const request = new Request("http://localhost/api/cron/expire-reservations", {
      method: "POST",
    });
    const response = await cronExpirePost(request);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.ok, false);
    assert.equal(body.code, "CRON_EXPIRE_RESERVATIONS_UNAUTHORIZED");
    assert.match(String(response.headers.get("www-authenticate")), /bearer/i);
  });
});

test("cron expire-reservations returns schema blocking envelope", async () => {
  await withTemporaryEnv(
    {
      NODE_ENV: "test",
      CRON_SECRET: "cron-secret",
      DATABASE_URL: "postgresql://example",
    },
    async () => {
      resetSchemaHealthCache();
      await withMockedQueryRaw(schemaHealthBlockingQueryResults(), async () => {
        await inspectSchemaHealth({ forceRefresh: true });

        const request = new Request("http://localhost/api/cron/expire-reservations", {
          method: "POST",
          headers: { authorization: "Bearer cron-secret" },
        });
        const response = await cronExpirePost(request);
        const body = await response.json();

        assert.equal(response.status, 503);
        assert.equal(body.ok, false);
        assert.equal(body.code, "CRON_EXPIRE_RESERVATIONS_SCHEMA_BLOCKING");
        assert.match(String(body.error), /schema drift/i);
        assert.match(String(body.recoveryHint), /db:preflight/i);
      });
    },
  );
});

test("cron expire-reservations maps missing paymentSplit prisma errors", async () => {
  const prismaTransaction = prisma.transaction as unknown as {
    findMany: (...args: unknown[]) => Promise<unknown>;
  };
  const originalFindMany = prismaTransaction.findMany;
  prismaTransaction.findMany = async () => {
    const { createPrismaKnownRequestError } = await import(
      "./helpers/prisma-test-utils"
    );
    throw createPrismaKnownRequestError("P2022", "Transaction.paymentSplit");
  };

  await withTemporaryEnv(
    {
      CRON_SECRET: "cron-secret",
      DATABASE_URL: "postgresql://example",
    },
    async () => {
      await primeSchemaHealth(schemaHealthNonBlockingQueryResults());

      const request = new Request("http://localhost/api/cron/expire-reservations", {
        method: "POST",
        headers: { authorization: "Bearer cron-secret" },
      });
      const response = await cronExpirePost(request);
      const body = await response.json();

      assert.equal(response.status, 503);
      assert.equal(body.code, "CRON_EXPIRE_RESERVATIONS_SCHEMA_DRIFT");
      assert.match(String(body.error), /missing Transaction\.paymentSplit/i);
    },
  );

  prismaTransaction.findMany = originalFindMany;
});

test("cron expire-reservations releases expired pending reservations", async () => {
  const prismaTransaction = prisma.transaction as unknown as {
    findMany: (...args: unknown[]) => Promise<unknown[]>;
  };
  const prismaClient = prisma as unknown as {
    $transaction: (...args: unknown[]) => Promise<unknown[]>;
  };

  await withTemporaryEnv(
    {
      CRON_SECRET: "cron-secret",
      DATABASE_URL: "postgresql://example",
    },
    async () => {
      await primeSchemaHealth(schemaHealthNonBlockingQueryResults());

      await withPatchedMethod(
        prismaTransaction,
        "findMany",
        async () => [{ id: "tx_expired", slabId: "slab_1" }],
        async () => {
          await withPatchedMethod(
            prismaClient,
            "$transaction",
            async (operations: unknown[]) => {
              assert.equal(Array.isArray(operations), true);
              assert.equal(operations.length, 2);
              return [
                { count: 1 },
                { count: 1 },
              ];
            },
            async () => {
              const request = new Request(
                "http://localhost/api/cron/expire-reservations",
                {
                  method: "POST",
                  headers: { authorization: "Bearer cron-secret" },
                },
              );
              const response = await cronExpirePost(request);
              const body = await response.json();

              assert.equal(response.status, 200);
              assert.equal(body.releasedTransactions, 1);
              assert.equal(body.releasedSlabs, 1);
            },
          );
        },
      );
    },
  );
});

test("cron expire-reservations returns internal error envelope on unexpected failures", async () => {
  const prismaTransaction = prisma.transaction as unknown as {
    findMany: (...args: unknown[]) => Promise<unknown[]>;
  };

  await withTemporaryEnv(
    {
      CRON_SECRET: "cron-secret",
      DATABASE_URL: "postgresql://example",
    },
    async () => {
      await primeSchemaHealth(schemaHealthNonBlockingQueryResults());

      await withPatchedMethod(
        prismaTransaction,
        "findMany",
        async () => {
          throw new Error("database unavailable");
        },
        async () => {
          const request = new Request(
            "http://localhost/api/cron/expire-reservations",
            {
              method: "POST",
              headers: { authorization: "Bearer cron-secret" },
            },
          );
          const response = await cronExpirePost(request);
          const body = await response.json();

          assert.equal(response.status, 500);
          assert.equal(body.ok, false);
          assert.equal(body.code, "CRON_EXPIRE_RESERVATIONS_INTERNAL_ERROR");
          assert.match(String(body.details?.reason), /database unavailable/i);
        },
      );
    },
  );
});
