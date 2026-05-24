import {
  buildTransactionStatusAccessMessage,
  buildTransactionsListAccessMessage,
  TRANSACTION_ACCESS_TTL_MS,
} from "@/lib/wallet-transaction-access-messages";
import { validateWalletAddress } from "@/lib/security";
import { verifyWalletSignatureBase64 } from "@/lib/wallet-challenge";

export {
  buildTransactionStatusAccessMessage,
  buildTransactionsListAccessMessage,
} from "@/lib/wallet-transaction-access-messages";

export function isTransactionAccessSignatureRequired(): boolean {
  const flag = process.env.TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE
    ?.trim()
    .toLowerCase();
  if (flag === "true" || flag === "1") return true;
  if (flag === "false" || flag === "0") return false;
  return process.env.NODE_ENV === "production";
}

function parseAccessExpiry(accessExpires: string): number | null {
  const expiresAtMs = Date.parse(accessExpires);
  if (Number.isNaN(expiresAtMs)) return null;
  return expiresAtMs;
}

function isAccessExpiryValid(expiresAtMs: number, now = Date.now()): boolean {
  if (expiresAtMs <= now) return false;
  if (expiresAtMs - now > TRANSACTION_ACCESS_TTL_MS) return false;
  return true;
}

export type WalletAccessParams = {
  buyerWallet: string | null;
  walletSignature: string | null;
  accessExpires: string | null;
};

export function parseWalletAccessParams(
  searchParams: URLSearchParams,
): WalletAccessParams {
  return {
    buyerWallet: searchParams.get("buyerWallet")?.trim() ?? null,
    walletSignature: searchParams.get("walletSignature")?.trim() ?? null,
    accessExpires: searchParams.get("accessExpires")?.trim() ?? null,
  };
}

export function verifyTransactionStatusWalletAccess(
  transactionId: string,
  params: WalletAccessParams,
): boolean {
  const { buyerWallet, walletSignature, accessExpires } = params;
  if (!buyerWallet || !validateWalletAddress(buyerWallet)) return false;

  if (!isTransactionAccessSignatureRequired()) {
    return true;
  }

  if (!walletSignature || !accessExpires) return false;

  const expiresAtMs = parseAccessExpiry(accessExpires);
  if (expiresAtMs == null || !isAccessExpiryValid(expiresAtMs)) return false;

  const message = buildTransactionStatusAccessMessage(
    transactionId,
    buyerWallet,
    accessExpires,
  );

  return verifyWalletSignatureBase64(message, walletSignature, buyerWallet);
}

export function verifyTransactionsListWalletAccess(
  params: WalletAccessParams,
): boolean {
  const { buyerWallet, walletSignature, accessExpires } = params;
  if (!buyerWallet || !validateWalletAddress(buyerWallet)) return false;

  if (!isTransactionAccessSignatureRequired()) {
    return true;
  }

  if (!walletSignature || !accessExpires) return false;

  const expiresAtMs = parseAccessExpiry(accessExpires);
  if (expiresAtMs == null || !isAccessExpiryValid(expiresAtMs)) return false;

  const message = buildTransactionsListAccessMessage(buyerWallet, accessExpires);

  return verifyWalletSignatureBase64(message, walletSignature, buyerWallet);
}
