import assert from "node:assert/strict";
import test from "node:test";

import { POST as checkoutPost } from "../app/api/marketplace/checkout/route";
import { POST as reservePost } from "../app/api/marketplace/reserve/route";
import { GET as adminTransactionsGet } from "../app/api/admin/transactions/route";
import { GET as adminSchemaHealthGet } from "../app/api/admin/schema-health/route";
import { prisma } from "../lib/prisma";
import {
  createPrismaKnownRequestError,
  schemaHealthBlockingQueryResults,
  schemaHealthNonBlockingQueryResults,
  withMockedQueryRaw,
} from "./helpers/prisma-test-utils";
import { inspectSchemaHealth, resetSchemaHealthCache } from "../lib/schema-health";
import { apiWriteRequest, withTemporaryEnv } from "./helpers/test-helpers";

async function withBlockingSchemaHealth<T>(
  results: unknown[],
  run: () => Promise<T>,
): Promise<T> {
  resetSchemaHealthCache();
  return withMockedQueryRaw(results, async () => {
    await inspectSchemaHealth({ forceRefresh: true });
    return run();
  });
}

test("reserve route returns 503 with schema-drift recovery hint", async () => {
  await withTemporaryEnv(
    {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://example",
      RESERVE_REQUIRE_WALLET_CHALLENGE: "false",
    },
    async () => {
      await withBlockingSchemaHealth(schemaHealthBlockingQueryResults(), async () => {
        const request = apiWriteRequest("http://localhost/api/marketplace/reserve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            slabId: "slab_1",
            buyerWallet: "11111111111111111111111111111111",
          }),
        });
        const response = await reservePost(request);
        const body = await response.json();

        assert.equal(response.status, 503);
        assert.match(String(body.error), /schema drift/i);
        assert.match(String(body.recoveryHint), /db:preflight/i);
        assert.ok(
          Array.isArray(body.details) &&
            body.details.some((detail: string) =>
              detail.includes("Missing Transaction columns"),
            ),
        );
      });
    },
  );
});

test("checkout route returns 503 with schema-drift recovery hint", async () => {
  await withTemporaryEnv(
    {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://example",
    },
    async () => {
      await withBlockingSchemaHealth(schemaHealthBlockingQueryResults(), async () => {
        const request = apiWriteRequest("http://localhost/api/marketplace/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            transactionId: "tx_1",
            transactionSignature: "sig_1",
            burnSignature: "burn_1",
          }),
        });
        const response = await checkoutPost(request);
        const body = await response.json();

        assert.equal(response.status, 503);
        assert.match(String(body.error), /schema drift/i);
        assert.match(String(body.recoveryHint), /db:preflight/i);
        assert.ok(
          Array.isArray(body.details) &&
            body.details.some((detail: string) =>
              detail.includes("Missing Transaction columns"),
            ),
        );
      });
    },
  );
});

test("admin transactions route returns blocking schema guidance", async () => {
  await withTemporaryEnv(
    {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://example",
      ADMIN_PASSWORD: "secret",
    },
    async () => {
      await withBlockingSchemaHealth(schemaHealthBlockingQueryResults(), async () => {
        const request = new Request("http://localhost/api/admin/transactions", {
          method: "GET",
          headers: { authorization: "Bearer secret" },
        });
        const response = await adminTransactionsGet(request);
        const body = await response.json();

        assert.equal(response.status, 503);
        assert.match(String(body.error), /schema drift/i);
        assert.match(String(body.recoveryHint), /db:preflight/i);
        assert.ok(
          Array.isArray(body.details) &&
            body.details.some((detail: string) =>
              String(detail).includes("Apply migrations"),
            ),
        );
      });
    },
  );
});

test("admin schema-health route returns machine-readable checks", async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousAdminPassword = process.env.ADMIN_PASSWORD;
  process.env.DATABASE_URL = "postgresql://example";
  process.env.ADMIN_PASSWORD = "secret";

  try {
    const request = new Request("http://localhost/api/admin/schema-health", {
      method: "GET",
      headers: { authorization: "Bearer secret" },
    });

    const response = await withMockedQueryRaw(
      schemaHealthBlockingQueryResults(),
      async () => adminSchemaHealthGet(request),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.isBlocking, true);
    assert.equal(body.schemaHealth?.severity, "blocking");
    assert.ok(Array.isArray(body.checks));
    assert.ok(
      body.checks.some(
        (check: { key?: string; status?: string }) =>
          check.key === "required-transaction-columns" &&
          check.status === "fail",
      ),
    );
  } finally {
    process.env.DATABASE_URL = previousDatabaseUrl;
    process.env.ADMIN_PASSWORD = previousAdminPassword;
  }
});

test("reserve route maps missing-column prisma errors to 503 hint", async () => {
  const prismaTransaction = prisma.transaction as unknown as {
    findMany: (...args: unknown[]) => Promise<unknown>;
  };
  const originalFindMany = prismaTransaction.findMany;
  prismaTransaction.findMany = async () => {
    throw createPrismaKnownRequestError("P2022", "Transaction.paymentSplit");
  };

  try {
    await withTemporaryEnv(
      {
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://example",
        RESERVE_REQUIRE_WALLET_CHALLENGE: "false",
      },
      async () => {
        await withBlockingSchemaHealth(
          schemaHealthNonBlockingQueryResults(),
          async () => {
            const request = apiWriteRequest("http://localhost/api/marketplace/reserve", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                slabId: "slab_1",
                buyerWallet: "11111111111111111111111111111111",
              }),
            });
            const response = await reservePost(request);
            const body = await response.json();

            assert.equal(response.status, 503);
            assert.match(String(body.error), /missing Transaction\.paymentSplit/i);
            assert.match(String(body.recoveryHint), /db:preflight/i);
          },
        );
      },
    );
  } finally {
    prismaTransaction.findMany = originalFindMany;
  }
});

test("checkout route maps missing-column prisma errors to 503 hint", async () => {
  const prismaTransaction = prisma.transaction as unknown as {
    findMany: (...args: unknown[]) => Promise<unknown>;
  };
  const originalFindMany = prismaTransaction.findMany;
  prismaTransaction.findMany = async () => {
    throw createPrismaKnownRequestError("P2022", "Transaction.paymentSplit");
  };

  try {
    await withTemporaryEnv(
      {
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://example",
      },
      async () => {
        await withBlockingSchemaHealth(
          schemaHealthNonBlockingQueryResults(),
          async () => {
            const request = apiWriteRequest("http://localhost/api/marketplace/checkout", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                transactionId: "tx_1",
                transactionSignature: "sig_1",
                burnSignature: "burn_1",
              }),
            });
            const response = await checkoutPost(request);
            const body = await response.json();

            assert.equal(response.status, 503);
            assert.match(String(body.error), /missing Transaction\.paymentSplit/i);
            assert.match(String(body.recoveryHint), /db:preflight/i);
          },
        );
      },
    );
  } finally {
    prismaTransaction.findMany = originalFindMany;
  }
});
