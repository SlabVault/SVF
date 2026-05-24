import assert from "node:assert/strict";
import test from "node:test";

import { ed25519 } from "@noble/curves/ed25519";
import { Keypair } from "@solana/web3.js";

import {
  buildTransactionStatusAccessMessage,
  buildTransactionsListAccessMessage,
  isTransactionAccessSignatureRequired,
  verifyTransactionStatusWalletAccess,
  verifyTransactionsListWalletAccess,
} from "../lib/wallet-transaction-access";
import { withTemporaryEnv } from "./helpers/test-helpers";

function signAccessMessage(keypair: Keypair, message: string): string {
  const messageBytes = new TextEncoder().encode(message);
  const signature = ed25519.sign(
    messageBytes,
    keypair.secretKey.slice(0, 32),
  );
  return Buffer.from(signature).toString("base64");
}

test("isTransactionAccessSignatureRequired respects explicit env override", () => {
  withTemporaryEnv({ TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE: "false" }, () => {
    assert.equal(isTransactionAccessSignatureRequired(), false);
  });

  withTemporaryEnv({ TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE: "true" }, () => {
    assert.equal(isTransactionAccessSignatureRequired(), true);
  });
});

test("verifyTransactionStatusWalletAccess accepts valid signed access", () => {
  const keypair = Keypair.generate();
  const buyerWallet = keypair.publicKey.toBase58();
  const accessExpires = new Date(Date.now() + 4 * 60 * 1000).toISOString();
  const message = buildTransactionStatusAccessMessage(
    "tx_1",
    buyerWallet,
    accessExpires,
  );

  withTemporaryEnv({ TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE: "true" }, () => {
    assert.equal(
      verifyTransactionStatusWalletAccess("tx_1", {
        buyerWallet,
        accessExpires,
        walletSignature: signAccessMessage(keypair, message),
      }),
      true,
    );
  });
});

test("verifyTransactionStatusWalletAccess rejects spoofed buyer wallet", () => {
  const keypair = Keypair.generate();
  const buyerWallet = keypair.publicKey.toBase58();
  const accessExpires = new Date(Date.now() + 4 * 60 * 1000).toISOString();
  const message = buildTransactionStatusAccessMessage(
    "tx_1",
    buyerWallet,
    accessExpires,
  );

  withTemporaryEnv({ TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE: "true" }, () => {
    assert.equal(
      verifyTransactionStatusWalletAccess("tx_1", {
        buyerWallet: "11111111111111111111111111111112",
        accessExpires,
        walletSignature: signAccessMessage(keypair, message),
      }),
      false,
    );
  });
});

test("verifyTransactionsListWalletAccess accepts valid signed access", () => {
  const keypair = Keypair.generate();
  const buyerWallet = keypair.publicKey.toBase58();
  const accessExpires = new Date(Date.now() + 4 * 60 * 1000).toISOString();
  const message = buildTransactionsListAccessMessage(buyerWallet, accessExpires);

  withTemporaryEnv({ TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE: "true" }, () => {
    assert.equal(
      verifyTransactionsListWalletAccess({
        buyerWallet,
        accessExpires,
        walletSignature: signAccessMessage(keypair, message),
      }),
      true,
    );
  });
});
