import assert from "node:assert/strict";
import test from "node:test";

import { ed25519 } from "@noble/curves/ed25519";
import { Keypair } from "@solana/web3.js";

import {
  issueReserveChallenge,
  issueTradeTxChallenge,
  isReserveWalletChallengeRequired,
  isTradeTxWalletChallengeRequired,
  resetReserveChallengesForTests,
  resetTradeTxChallengesForTests,
  verifyReserveChallenge,
  verifyTradeTxChallenge,
  verifyWalletSignatureBase64,
} from "../lib/wallet-challenge";
import { withTemporaryEnv } from "./helpers/test-helpers";

function signChallengeMessage(keypair: Keypair, message: string): string {
  const messageBytes = new TextEncoder().encode(message);
  const signature = ed25519.sign(
    messageBytes,
    keypair.secretKey.slice(0, 32),
  );
  return Buffer.from(signature).toString("base64");
}

test("isTradeTxWalletChallengeRequired respects explicit env override", () => {
  withTemporaryEnv({ TRADE_TX_REQUIRE_WALLET_CHALLENGE: "false" }, () => {
    assert.equal(isTradeTxWalletChallengeRequired(), false);
  });

  withTemporaryEnv({ TRADE_TX_REQUIRE_WALLET_CHALLENGE: "true" }, () => {
    assert.equal(isTradeTxWalletChallengeRequired(), true);
  });
});

test("isReserveWalletChallengeRequired respects explicit env override", () => {
  withTemporaryEnv({ RESERVE_REQUIRE_WALLET_CHALLENGE: "false" }, () => {
    assert.equal(isReserveWalletChallengeRequired(), false);
  });

  withTemporaryEnv({ RESERVE_REQUIRE_WALLET_CHALLENGE: "true" }, () => {
    assert.equal(isReserveWalletChallengeRequired(), true);
  });
});

test("verifyReserveChallenge accepts valid wallet signature", () => {
  resetReserveChallengesForTests();

  const keypair = Keypair.generate();
  const buyerWallet = keypair.publicKey.toBase58();
  const challenge = issueReserveChallenge(buyerWallet);
  const walletSignature = signChallengeMessage(keypair, challenge.message);

  assert.equal(
    verifyWalletSignatureBase64(challenge.message, walletSignature, buyerWallet),
    true,
  );

  const result = verifyReserveChallenge(
    challenge.challengeId,
    buyerWallet,
    walletSignature,
  );
  assert.deepEqual(result, { ok: true });
});

test("verifyTradeTxChallenge accepts valid wallet signature", () => {
  resetTradeTxChallengesForTests();

  const keypair = Keypair.generate();
  const wallet = keypair.publicKey.toBase58();
  const challenge = issueTradeTxChallenge(wallet);
  const walletSignature = signChallengeMessage(keypair, challenge.message);

  const result = verifyTradeTxChallenge(
    challenge.challengeId,
    wallet,
    walletSignature,
  );
  assert.deepEqual(result, { ok: true });
});

test("verifyReserveChallenge rejects replayed challenge ids", () => {
  resetReserveChallengesForTests();

  const keypair = Keypair.generate();
  const buyerWallet = keypair.publicKey.toBase58();
  const challenge = issueReserveChallenge(buyerWallet);
  const walletSignature = signChallengeMessage(keypair, challenge.message);

  assert.deepEqual(
    verifyReserveChallenge(challenge.challengeId, buyerWallet, walletSignature),
    { ok: true },
  );

  const replay = verifyReserveChallenge(
    challenge.challengeId,
    buyerWallet,
    walletSignature,
  );
  assert.equal(replay.ok, false);
  if (!replay.ok) {
    assert.equal(replay.code, "RESERVE_CHALLENGE_NOT_FOUND");
  }
});
