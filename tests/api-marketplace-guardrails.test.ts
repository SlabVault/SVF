import assert from "node:assert/strict";
import test from "node:test";

import { ed25519 } from "@noble/curves/ed25519";
import { Keypair } from "@solana/web3.js";

import { GET as marketplaceTransactionsGet } from "../app/api/marketplace/transactions/route";
import { GET as marketplaceStatusGet } from "../app/api/marketplace/status/[id]/route";
import { prisma } from "../lib/prisma";
import {
  buildTransactionStatusAccessMessage,
  buildTransactionsListAccessMessage,
} from "../lib/wallet-transaction-access";
import {
  withPatchedMethod,
  withTemporaryEnv,
} from "./helpers/test-helpers";

function signAccessMessage(keypair: Keypair, message: string): string {
  const messageBytes = new TextEncoder().encode(message);
  const signature = ed25519.sign(
    messageBytes,
    keypair.secretKey.slice(0, 32),
  );
  return Buffer.from(signature).toString("base64");
}

function buildSignedStatusUrl(
  keypair: Keypair,
  transactionId: string,
): string {
  const buyerWallet = keypair.publicKey.toBase58();
  const accessExpires = new Date(Date.now() + 4 * 60 * 1000).toISOString();
  const message = buildTransactionStatusAccessMessage(
    transactionId,
    buyerWallet,
    accessExpires,
  );
  const params = new URLSearchParams({
    buyerWallet,
    accessExpires,
    walletSignature: signAccessMessage(keypair, message),
  });
  return `http://localhost/api/marketplace/status/${transactionId}?${params.toString()}`;
}

function buildSignedTransactionsUrl(keypair: Keypair): string {
  const buyerWallet = keypair.publicKey.toBase58();
  const accessExpires = new Date(Date.now() + 4 * 60 * 1000).toISOString();
  const message = buildTransactionsListAccessMessage(buyerWallet, accessExpires);
  const params = new URLSearchParams({
    buyerWallet,
    accessExpires,
    walletSignature: signAccessMessage(keypair, message),
  });
  return `http://localhost/api/marketplace/transactions?${params.toString()}`;
}

test("marketplace transactions require buyerWallet when caller is not admin", async () => {
  await withTemporaryEnv(
    {
      ADMIN_PASSWORD: "secret",
      TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE: "false",
    },
    async () => {
      const request = new Request("http://localhost/api/marketplace/transactions");
      const response = await marketplaceTransactionsGet(request);
      const body = await response.json();

      assert.equal(response.status, 401);
      assert.equal(body.code, "MARKETPLACE_TRANSACTIONS_BUYER_WALLET_REQUIRED");
    },
  );
});

test("marketplace transactions redact wallet + signatures for non-admin responses", async () => {
  const prismaTransaction = prisma.transaction as unknown as {
    findMany: (...args: unknown[]) => Promise<unknown[]>;
  };

  await withTemporaryEnv(
    {
      ADMIN_PASSWORD: "secret",
      TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE: "false",
    },
    async () => {
      await withPatchedMethod(
        prismaTransaction,
        "findMany",
        async () => [
          {
            id: "tx_1",
            buyerWallet: "wallet_from_other_user",
            status: "PENDING",
            transactionSignature: "tx_sig",
            burnSignature: "burn_sig",
            fulfillmentSignature: "fulfill_sig",
            slab: null,
          },
        ],
        async () => {
          const request = new Request(
            "http://localhost/api/marketplace/transactions?buyerWallet=wallet_query",
          );
          const response = await marketplaceTransactionsGet(request);
          const body = (await response.json()) as Array<Record<string, unknown>>;

          assert.equal(response.status, 200);
          assert.equal(body.length, 1);
          assert.equal(body[0].buyerWallet, "redacted");
          assert.equal(body[0].transactionSignature, null);
          assert.equal(body[0].burnSignature, null);
          assert.equal(body[0].fulfillmentSignature, null);
        },
      );
    },
  );
});

test("marketplace transactions expose signatures to signed buyer queries", async () => {
  const prismaTransaction = prisma.transaction as unknown as {
    findMany: (...args: unknown[]) => Promise<unknown[]>;
  };
  const keypair = Keypair.generate();
  const buyerWallet = keypair.publicKey.toBase58();

  await withTemporaryEnv(
    {
      ADMIN_PASSWORD: "secret",
      TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE: "true",
    },
    async () => {
      await withPatchedMethod(
        prismaTransaction,
        "findMany",
        async () => [
          {
            id: "tx_1",
            buyerWallet,
            status: "PENDING",
            transactionSignature: "tx_sig",
            burnSignature: "burn_sig",
            fulfillmentSignature: "fulfill_sig",
            slab: null,
          },
        ],
        async () => {
          const request = new Request(buildSignedTransactionsUrl(keypair));
          const response = await marketplaceTransactionsGet(request);
          const body = (await response.json()) as Array<Record<string, unknown>>;

          assert.equal(response.status, 200);
          assert.equal(body[0].buyerWallet, buyerWallet);
          assert.equal(body[0].transactionSignature, "tx_sig");
        },
      );
    },
  );
});

test("marketplace transactions expose signatures to admin queries", async () => {
  const prismaTransaction = prisma.transaction as unknown as {
    findMany: (...args: unknown[]) => Promise<unknown[]>;
  };

  await withTemporaryEnv(
    {
      ADMIN_PASSWORD: "secret",
      TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE: "false",
    },
    async () => {
      await withPatchedMethod(
        prismaTransaction,
        "findMany",
        async () => [
          {
            id: "tx_1",
            buyerWallet: "wallet_query",
            status: "PENDING",
            transactionSignature: "tx_sig",
            burnSignature: "burn_sig",
            fulfillmentSignature: "fulfill_sig",
            slab: null,
          },
        ],
        async () => {
          const request = new Request("http://localhost/api/marketplace/transactions", {
            headers: { authorization: "Bearer secret" },
          });
          const response = await marketplaceTransactionsGet(request);
          const body = (await response.json()) as Array<Record<string, unknown>>;

          assert.equal(response.status, 200);
          assert.equal(body[0].buyerWallet, "wallet_query");
          assert.equal(body[0].transactionSignature, "tx_sig");
          assert.equal(body[0].burnSignature, "burn_sig");
          assert.equal(body[0].fulfillmentSignature, "fulfill_sig");
        },
      );
    },
  );
});

test("marketplace status hides signatures from non-buyer non-admin callers", async () => {
  const prismaTransaction = prisma.transaction as unknown as {
    findUnique: (...args: unknown[]) => Promise<unknown>;
  };

  await withTemporaryEnv(
    {
      ADMIN_PASSWORD: "secret",
      TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE: "false",
    },
    async () => {
      await withPatchedMethod(
        prismaTransaction,
        "findUnique",
        async () => ({
          id: "tx_1",
          status: "PENDING",
          buyerWallet: "buyer_wallet",
          solAmount: 1.25,
          svfAmount: 250,
          totalUsdValue: 100,
          paymentSplit: "FIXED_DUAL",
          reservedExpiresAt: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          completedAt: null,
          fulfilledAt: null,
          transactionSignature: "tx_sig",
          burnSignature: "burn_sig",
          fulfillmentSignature: "fulfill_sig",
          slab: {
            id: "slab_1",
            name: "Base Set Charizard",
            grade: "PSA 9",
            imageUrl: "https://example.com/slab.png",
            estimatedValueUsd: 900,
          },
        }),
        async () => {
          const request = new Request(
            "http://localhost/api/marketplace/status/tx_1?buyerWallet=not_the_buyer",
          );
          const response = await marketplaceStatusGet(request, {
            params: Promise.resolve({ id: "tx_1" }),
          });
          const body = await response.json();

          assert.equal(response.status, 200);
          assert.equal(body.id, "tx_1");
          assert.equal(body.buyerWallet, "buyer_wallet");
          assert.equal("transactionSignature" in body, false);
          assert.equal("burnSignature" in body, false);
          assert.equal("fulfillmentSignature" in body, false);
          assert.equal(body.slab.estimatedValueUsd, undefined);
        },
      );
    },
  );
});

test("marketplace status rejects spoofed buyer wallet when signature is required", async () => {
  const prismaTransaction = prisma.transaction as unknown as {
    findUnique: (...args: unknown[]) => Promise<unknown>;
  };

  await withTemporaryEnv(
    {
      ADMIN_PASSWORD: "secret",
      TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE: "true",
    },
    async () => {
      await withPatchedMethod(
        prismaTransaction,
        "findUnique",
        async () => ({
          id: "tx_1",
          status: "PENDING",
          buyerWallet: "buyer_wallet",
          solAmount: 1.25,
          svfAmount: 250,
          totalUsdValue: 100,
          paymentSplit: "FIXED_DUAL",
          reservedExpiresAt: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          completedAt: null,
          fulfilledAt: null,
          transactionSignature: "tx_sig",
          burnSignature: "burn_sig",
          fulfillmentSignature: "fulfill_sig",
          slab: null,
        }),
        async () => {
          const request = new Request(
            "http://localhost/api/marketplace/status/tx_1?buyerWallet=buyer_wallet",
          );
          const response = await marketplaceStatusGet(request, {
            params: Promise.resolve({ id: "tx_1" }),
          });
          const body = await response.json();

          assert.equal(response.status, 200);
          assert.equal("transactionSignature" in body, false);
        },
      );
    },
  );
});

test("marketplace status exposes signatures to signed buyer callers", async () => {
  const prismaTransaction = prisma.transaction as unknown as {
    findUnique: (...args: unknown[]) => Promise<unknown>;
  };
  const keypair = Keypair.generate();
  const buyerWallet = keypair.publicKey.toBase58();

  await withTemporaryEnv(
    {
      ADMIN_PASSWORD: "secret",
      TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE: "true",
    },
    async () => {
      await withPatchedMethod(
        prismaTransaction,
        "findUnique",
        async () => ({
          id: "tx_1",
          status: "PENDING_FULFILLMENT",
          buyerWallet,
          solAmount: 1.25,
          svfAmount: 250,
          totalUsdValue: 100,
          paymentSplit: "FIXED_DUAL",
          reservedExpiresAt: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          completedAt: new Date("2026-01-02T00:00:00.000Z"),
          fulfilledAt: null,
          transactionSignature: "tx_sig",
          burnSignature: "burn_sig",
          fulfillmentSignature: "fulfill_sig",
          slab: {
            id: "slab_1",
            name: "Base Set Charizard",
            grade: "PSA 9",
            imageUrl: "https://example.com/slab.png",
            estimatedValueUsd: 900,
          },
        }),
        async () => {
          const request = new Request(buildSignedStatusUrl(keypair, "tx_1"));
          const response = await marketplaceStatusGet(request, {
            params: Promise.resolve({ id: "tx_1" }),
          });
          const body = await response.json();

          assert.equal(response.status, 200);
          assert.equal(body.transactionSignature, "tx_sig");
          assert.equal(body.burnSignature, "burn_sig");
          assert.equal(body.fulfillmentSignature, "fulfill_sig");
          assert.equal(body.slab.estimatedValueUsd, 900);
        },
      );
    },
  );
});

test("marketplace status exposes signatures to admin callers", async () => {
  const prismaTransaction = prisma.transaction as unknown as {
    findUnique: (...args: unknown[]) => Promise<unknown>;
  };

  await withTemporaryEnv(
    {
      ADMIN_PASSWORD: "secret",
      TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE: "false",
    },
    async () => {
      await withPatchedMethod(
        prismaTransaction,
        "findUnique",
        async () => ({
          id: "tx_1",
          status: "PENDING_FULFILLMENT",
          buyerWallet: "buyer_wallet",
          solAmount: 1.25,
          svfAmount: 250,
          totalUsdValue: 100,
          paymentSplit: "FIXED_DUAL",
          reservedExpiresAt: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          completedAt: new Date("2026-01-02T00:00:00.000Z"),
          fulfilledAt: null,
          transactionSignature: "tx_sig",
          burnSignature: "burn_sig",
          fulfillmentSignature: "fulfill_sig",
          slab: {
            id: "slab_1",
            name: "Base Set Charizard",
            grade: "PSA 9",
            imageUrl: "https://example.com/slab.png",
            estimatedValueUsd: 900,
          },
        }),
        async () => {
          const request = new Request("http://localhost/api/marketplace/status/tx_1", {
            headers: { authorization: "Bearer secret" },
          });
          const response = await marketplaceStatusGet(request, {
            params: Promise.resolve({ id: "tx_1" }),
          });
          const body = await response.json();

          assert.equal(response.status, 200);
          assert.equal(body.transactionSignature, "tx_sig");
          assert.equal(body.burnSignature, "burn_sig");
          assert.equal(body.fulfillmentSignature, "fulfill_sig");
          assert.equal(body.slab.estimatedValueUsd, 900);
        },
      );
    },
  );
});
