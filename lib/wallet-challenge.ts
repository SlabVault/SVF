import { createPublicKey, randomUUID, verify } from "node:crypto";

import { PublicKey } from "@solana/web3.js";

import { validateWalletAddress } from "@/lib/security";

/** SPKI prefix for raw 32-byte Ed25519 public keys (Solana wallet addresses). */
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const MAX_CHALLENGES = 5_000;

type ChallengeRecord = {
  buyerWallet: string;
  message: string;
  expiresAt: number;
};

const challengeStore = new Map<string, ChallengeRecord>();
const tradeChallengeStore = new Map<string, ChallengeRecord>();

function pruneChallengeMap(store: Map<string, ChallengeRecord>, now = Date.now()) {
  for (const [id, record] of store.entries()) {
    if (record.expiresAt <= now) {
      store.delete(id);
    }
  }

  if (store.size <= MAX_CHALLENGES) return;

  const overflow = store.size - MAX_CHALLENGES;
  let removed = 0;
  for (const id of store.keys()) {
    store.delete(id);
    removed++;
    if (removed >= overflow) break;
  }
}

function pruneExpiredChallenges(now = Date.now()) {
  pruneChallengeMap(challengeStore, now);
  pruneChallengeMap(tradeChallengeStore, now);
}

export function isReserveWalletChallengeRequired(): boolean {
  const flag = process.env.RESERVE_REQUIRE_WALLET_CHALLENGE?.trim().toLowerCase();
  if (flag === "true" || flag === "1") return true;
  if (flag === "false" || flag === "0") return false;
  return process.env.NODE_ENV === "production";
}

export function issueReserveChallenge(buyerWallet: string): {
  challengeId: string;
  message: string;
  expiresAt: string;
} {
  const challengeId = randomUUID();
  const expiresAtMs = Date.now() + CHALLENGE_TTL_MS;
  const expiresAt = new Date(expiresAtMs).toISOString();
  const message = [
    "SlabVaultFi reserve",
    `Wallet: ${buyerWallet}`,
    `Challenge: ${challengeId}`,
    `Expires: ${expiresAt}`,
  ].join("\n");

  pruneExpiredChallenges();
  challengeStore.set(challengeId, {
    buyerWallet,
    message,
    expiresAt: expiresAtMs,
  });

  return { challengeId, message, expiresAt };
}

export function verifyWalletSignatureBase64(
  message: string,
  walletSignatureBase64: string,
  buyerWallet: string,
): boolean {
  if (!validateWalletAddress(buyerWallet)) return false;

  try {
    const messageBytes = new TextEncoder().encode(message);
    const signature = Buffer.from(walletSignatureBase64, "base64");
    const publicKeyBytes = new PublicKey(buyerWallet).toBytes();
    const keyObject = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyBytes)]),
      format: "der",
      type: "spki",
    });
    return verify(null, messageBytes, keyObject, signature);
  } catch {
    return false;
  }
}

export type ReserveChallengeVerification =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function verifyReserveChallenge(
  challengeId: string,
  buyerWallet: string,
  walletSignatureBase64: string,
): ReserveChallengeVerification {
  const record = challengeStore.get(challengeId);
  if (!record) {
    return {
      ok: false,
      code: "RESERVE_CHALLENGE_NOT_FOUND",
      message: "Reserve wallet challenge not found or already used.",
    };
  }

  if (record.expiresAt <= Date.now()) {
    challengeStore.delete(challengeId);
    return {
      ok: false,
      code: "RESERVE_CHALLENGE_EXPIRED",
      message: "Reserve wallet challenge expired. Request a new challenge.",
    };
  }

  if (record.buyerWallet !== buyerWallet) {
    return {
      ok: false,
      code: "RESERVE_CHALLENGE_WALLET_MISMATCH",
      message: "Wallet address does not match the issued challenge.",
    };
  }

  if (
    !verifyWalletSignatureBase64(
      record.message,
      walletSignatureBase64,
      buyerWallet,
    )
  ) {
    return {
      ok: false,
      code: "RESERVE_CHALLENGE_INVALID_SIGNATURE",
      message: "Wallet signature verification failed.",
    };
  }

  challengeStore.delete(challengeId);
  return { ok: true };
}

export function isTradeTxWalletChallengeRequired(): boolean {
  const flag = process.env.TRADE_TX_REQUIRE_WALLET_CHALLENGE?.trim().toLowerCase();
  if (flag === "true" || flag === "1") return true;
  if (flag === "false" || flag === "0") return false;
  return process.env.NODE_ENV === "production";
}

export function issueTradeTxChallenge(wallet: string): {
  challengeId: string;
  message: string;
  expiresAt: string;
} {
  const challengeId = randomUUID();
  const expiresAtMs = Date.now() + CHALLENGE_TTL_MS;
  const expiresAt = new Date(expiresAtMs).toISOString();
  const message = [
    "SlabVaultFi trade tx",
    `Wallet: ${wallet}`,
    `Challenge: ${challengeId}`,
    `Expires: ${expiresAt}`,
  ].join("\n");

  pruneExpiredChallenges();
  tradeChallengeStore.set(challengeId, {
    buyerWallet: wallet,
    message,
    expiresAt: expiresAtMs,
  });

  return { challengeId, message, expiresAt };
}

export type TradeTxChallengeVerification =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function verifyTradeTxChallenge(
  challengeId: string,
  wallet: string,
  walletSignatureBase64: string,
): TradeTxChallengeVerification {
  const record = tradeChallengeStore.get(challengeId);
  if (!record) {
    return {
      ok: false,
      code: "TRADE_TX_CHALLENGE_NOT_FOUND",
      message: "Trade tx wallet challenge not found or already used.",
    };
  }

  if (record.expiresAt <= Date.now()) {
    tradeChallengeStore.delete(challengeId);
    return {
      ok: false,
      code: "TRADE_TX_CHALLENGE_EXPIRED",
      message: "Trade tx wallet challenge expired. Request a new challenge.",
    };
  }

  if (record.buyerWallet !== wallet) {
    return {
      ok: false,
      code: "TRADE_TX_CHALLENGE_WALLET_MISMATCH",
      message: "Wallet address does not match the issued challenge.",
    };
  }

  if (
    !verifyWalletSignatureBase64(
      record.message,
      walletSignatureBase64,
      wallet,
    )
  ) {
    return {
      ok: false,
      code: "TRADE_TX_CHALLENGE_INVALID_SIGNATURE",
      message: "Wallet signature verification failed.",
    };
  }

  tradeChallengeStore.delete(challengeId);
  return { ok: true };
}

/** Test helper — clears in-memory challenge store. */
export function resetReserveChallengesForTests() {
  challengeStore.clear();
}

/** Test helper — clears trade tx challenge store. */
export function resetTradeTxChallengesForTests() {
  tradeChallengeStore.clear();
}
