import assert from "node:assert/strict";
import test from "node:test";

import { POST as checkoutPost } from "../app/api/marketplace/checkout/route";
import { prisma } from "../lib/prisma";
import { withHealthySchemaForTests } from "./helpers/prisma-test-utils";
import {
  apiWriteRequest,
  withPatchedMethod,
  withTemporaryEnv,
} from "./helpers/test-helpers";

const checkoutBody = {
  transactionId: "tx_1",
  transactionSignature: "sig_sol",
  burnSignature: "sig_burn",
};

function pendingTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: "tx_1",
    status: "PENDING",
    buyerWallet: "11111111111111111111111111111111",
    solAmount: 1.25,
    svfAmount: 250,
    totalUsdValue: 100,
    paymentSplit: "FIXED_DUAL",
    reservedExpiresAt: new Date(Date.now() + 60_000),
    transactionSignature: null,
    burnSignature: null,
    solPaidAt: null,
    slabId: "slab_1",
    slab: { id: "slab_1", status: "RESERVED" },
    ...overrides,
  };
}

async function runCheckout(
  transaction: unknown,
  options?: {
    findFirstResult?: unknown;
    updateManyCount?: number;
    latestAfterConflict?: unknown;
  },
) {
  const prismaTransaction = prisma.transaction as unknown as {
    findMany: (...args: unknown[]) => Promise<unknown[]>;
    findUnique: (...args: unknown[]) => Promise<unknown>;
    findFirst: (...args: unknown[]) => Promise<unknown>;
    updateMany: (...args: unknown[]) => Promise<{ count: number }>;
  };
  const prismaClient = prisma as unknown as {
    $transaction: (...args: unknown[]) => Promise<unknown>;
  };

  return withTemporaryEnv({ DATABASE_URL: "postgresql://example" }, async () =>
    withHealthySchemaForTests(async () =>
      withPatchedMethod(prismaTransaction, "findMany", async () => [], async () =>
        withPatchedMethod(
          prismaTransaction,
          "findUnique",
          async () => transaction,
          async () =>
            withPatchedMethod(
              prismaTransaction,
              "findFirst",
              async () => options?.findFirstResult ?? null,
              async () =>
                withPatchedMethod(
                  prismaTransaction,
                  "updateMany",
                  async () => ({ count: options?.updateManyCount ?? 1 }),
                  async () =>
                    withPatchedMethod(
                      prismaClient,
                      "$transaction",
                      async () => [],
                      async () => {
                        const request = apiWriteRequest(
                          "http://localhost/api/marketplace/checkout",
                          {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify(checkoutBody),
                          },
                        );
                        return checkoutPost(request);
                      },
                    ),
                ),
            ),
        ),
      ),
    ),
  );
}

test("checkout rejects missing required signatures", async () => {
  const prismaTransaction = prisma.transaction as unknown as {
    findMany: (...args: unknown[]) => Promise<unknown[]>;
  };

  await withTemporaryEnv({ DATABASE_URL: "postgresql://example" }, async () =>
    withHealthySchemaForTests(async () =>
      withPatchedMethod(prismaTransaction, "findMany", async () => [], async () => {
        const request = apiWriteRequest("http://localhost/api/marketplace/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ transactionId: "tx_1" }),
        });
        const response = await checkoutPost(request);
        const body = await response.json();

        assert.equal(response.status, 400);
        assert.equal(body.code, "CHECKOUT_INVALID_INPUT");
      }),
    ),
  );
});

test("checkout returns not found for unknown transactions", async () => {
  const response = await runCheckout(null);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.code, "CHECKOUT_TRANSACTION_NOT_FOUND");
});

test("checkout blocks illegal status when signatures do not match replay", async () => {
  const response = await runCheckout(
    pendingTransaction({
      status: "FAILED",
      transactionSignature: "other_sig",
      burnSignature: "other_burn",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.code, "CHECKOUT_ILLEGAL_STATUS");
  assert.equal(body.details.currentStatus, "FAILED");
  assert.deepEqual(body.details.allowedTransitions, []);
});

test("checkout replays idempotently for completed transactions with matching signatures", async () => {
  const response = await runCheckout(
    pendingTransaction({
      status: "COMPLETED",
      transactionSignature: checkoutBody.transactionSignature,
      burnSignature: checkoutBody.burnSignature,
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.idempotentReplay, true);
  assert.equal(body.status, "COMPLETED");
});

test("checkout cancels and rejects expired reservations", async () => {
  const prismaTransaction = prisma.transaction as unknown as {
    findMany: (...args: unknown[]) => Promise<unknown[]>;
    findUnique: (...args: unknown[]) => Promise<unknown>;
  };
  const prismaClient = prisma as unknown as {
    $transaction: (...args: unknown[]) => Promise<unknown[]>;
  };

  let cancelled = false;

  await withTemporaryEnv({ DATABASE_URL: "postgresql://example" }, async () => {
    await withHealthySchemaForTests(async () => {
      await withPatchedMethod(prismaTransaction, "findMany", async () => [], async () => {
        await withPatchedMethod(
          prismaTransaction,
          "findUnique",
          async () =>
            pendingTransaction({
              reservedExpiresAt: new Date(Date.now() - 60_000),
            }),
          async () => {
            await withPatchedMethod(
              prismaClient,
              "$transaction",
              async () => {
                cancelled = true;
                return [{ count: 1 }, { count: 1 }];
              },
              async () => {
                const request = apiWriteRequest(
                  "http://localhost/api/marketplace/checkout",
                  {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(checkoutBody),
                  },
                );
                const response = await checkoutPost(request);
                const body = await response.json();

                assert.equal(response.status, 409);
                assert.equal(body.code, "CHECKOUT_RESERVATION_EXPIRED");
                assert.equal(cancelled, true);
              },
            );
          },
        );
      });
    });
  });
});

test("checkout rejects signature replay from another transaction", async () => {
  const response = await runCheckout(pendingTransaction(), {
    findFirstResult: { id: "tx_other" },
  });
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.code, "CHECKOUT_SIGNATURE_REPLAY");
  assert.equal(body.details.replayTransactionId, "tx_other");
});

test("checkout replays idempotently for pending fulfillment with matching signatures", async () => {
  const response = await runCheckout(
    pendingTransaction({
      status: "PENDING_FULFILLMENT",
      transactionSignature: checkoutBody.transactionSignature,
      burnSignature: checkoutBody.burnSignature,
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.idempotentReplay, true);
  assert.equal(body.status, "PENDING_FULFILLMENT");
});

test("checkout rejects pending fulfillment replay when burn signature mismatches", async () => {
  const response = await runCheckout(
    pendingTransaction({
      status: "PENDING_FULFILLMENT",
      transactionSignature: checkoutBody.transactionSignature,
      burnSignature: "different_burn",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.code, "CHECKOUT_ILLEGAL_STATUS");
  assert.equal(body.details.currentStatus, "PENDING_FULFILLMENT");
  assert.deepEqual(body.details.allowedTransitions, ["COMPLETED", "FAILED", "CANCELLED"]);
});

test("checkout surfaces payment verification failures before state transition", async () => {
  const response = await runCheckout(pendingTransaction());
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.code, "CHECKOUT_PAYMENT_VERIFICATION_FAILED");
  assert.equal(body.details.transactionId, "tx_1");
});
