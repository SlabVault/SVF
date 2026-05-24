/**
 * Tensor Foundation BFF helpers — server-side API key + RPC for `/api/trade/tx/*`.
 *
 * @see vendor/marketplace-nextjs-template/web/app/api/
 * @see docs/integrations/onchain-trade-stack.md
 */

import {
  Connection,
  PublicKey,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";

import { jsonError } from "@/lib/api-errors";
import { isTrustedWriteOrigin } from "@/lib/csrf";
import { resolveServerSolanaRpcUrl, isSolanaRpcExplicitlyConfigured } from "@/lib/solana-config";
import { validateWalletAddress } from "@/lib/security";
import {
  isTradeTxWalletChallengeRequired,
  verifyTradeTxChallenge,
} from "@/lib/wallet-challenge";
import {
  getTensorApiBaseUrl,
  getTensorApiKey,
  isTensorReadConfigured,
  isTensorTradeWriteEnabled,
} from "@/lib/integrations/tensor";

/** Public trade-tx JSON copy — never name server env vars or echo API keys. */
export const TENSOR_REST_NOT_CONFIGURED_MESSAGE =
  "Tensor REST is not configured on the server. Use writePath=sdk for on-chain SDK writes.";

export class TensorBffError extends Error {
  constructor(
    message: string,
    readonly status: number = 503,
  ) {
    super(redactTensorApiLeak(message));
    this.name = "TensorBffError";
  }
}

export function requireTensorApiKey(): string {
  const key = getTensorApiKey();
  if (!key) {
    throw new TensorBffError(TENSOR_REST_NOT_CONFIGURED_MESSAGE, 503);
  }
  return key;
}

export function tensorApiHeaders(): HeadersInit {
  return {
    accept: "application/json",
    "x-tensor-api-key": requireTensorApiKey(),
  };
}

export function getSolanaConnection(): Connection {
  if (!isSolanaRpcExplicitlyConfigured()) {
    throw new TensorBffError(
      "SOLANA_RPC_URL or NEXT_PUBLIC_SOLANA_RPC_URL is required for Tensor tx routes.",
      503,
    );
  }
  return new Connection(resolveServerSolanaRpcUrl(), "confirmed");
}

export function tensorApiUrl(path: string, params?: Record<string, string>): string {
  const base = getTensorApiBaseUrl().replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${normalized}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

/** Strip env var names and configured Tensor API key material from client-facing errors. */
export function redactTensorApiLeak(text: string): string {
  let redacted = text.split("TENSOR_API_KEY").join("Tensor API credential");
  const key = getTensorApiKey();
  if (key) {
    redacted = redacted.split(key).join("[REDACTED]");
  }
  return redacted.replace(
    /x-tensor-api-key["\s:=]+[^\s"',}]+/gi,
    "tensor-auth-header:[REDACTED]",
  );
}

export async function fetchTensorApiJson<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const response = await fetch(tensorApiUrl(path, params), {
    headers: tensorApiHeaders(),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = redactTensorApiLeak((await response.text()).slice(0, 200));
    throw new TensorBffError(
      `Tensor API ${path} failed (${response.status}): ${body}`,
      response.status >= 500 ? 502 : response.status,
    );
  }
  return (await response.json()) as T;
}

export function isTensorTxBffConfigured(): boolean {
  return isTensorReadConfigured();
}

export function isTensorTxWriteConfigured(): boolean {
  return isTensorTradeWriteEnabled();
}

export class TensorTradeWriteDisabledError extends TensorBffError {
  constructor() {
    super(
      "Tensor trade write path is disabled. Set TENSOR_TRADE_WRITE_ENABLED=true on staging only.",
      503,
    );
    this.name = "TensorTradeWriteDisabledError";
  }
}

/** Gate list/buy/delist BFF routes — keep false in production. */
export function assertTensorTradeWriteEnabled(): void {
  if (!isTensorTradeWriteEnabled()) {
    throw new TensorTradeWriteDisabledError();
  }
}

/** Optional origin gate — enable with TENSOR_TX_REQUIRE_TRUSTED_ORIGIN=true. */
export function requireTrustedTensorTxOrigin(request: Request) {
  if (process.env.TENSOR_TX_REQUIRE_TRUSTED_ORIGIN !== "true") return null;
  if (isTrustedWriteOrigin(request)) return null;
  return jsonError({
    request,
    status: 403,
    code: "TRADE_TX_ORIGIN_REJECTED",
    message: "Tensor tx BFF request rejected for untrusted origin.",
    recoveryHint: "Call /api/trade/tx/* from the SlabVaultFi app origin.",
  });
}

/**
 * Optional wallet challenge — enable with TRADE_TX_REQUIRE_WALLET_CHALLENGE=true.
 * Query: challengeId, walletSignature (mirrors marketplace reserve POST body fields).
 */
export function requireTradeTxWalletChallenge(
  request: Request,
  wallet: string,
): Response | null {
  if (!isTradeTxWalletChallengeRequired()) return null;

  const params = new URL(request.url).searchParams;
  const challengeId = params.get("challengeId")?.trim() ?? "";
  const walletSignature = params.get("walletSignature")?.trim() ?? "";

  if (!challengeId || !walletSignature) {
    return jsonError({
      request,
      status: 400,
      code: "TRADE_TX_WALLET_CHALLENGE_REQUIRED",
      message: "Wallet challenge signature is required for this trade tx.",
      recoveryHint:
        "Request GET /api/trade/tx/challenge?wallet=<buyer>, sign the message with your wallet, and retry.",
    });
  }

  if (!validateWalletAddress(wallet)) {
    return jsonError({
      request,
      status: 400,
      code: "TRADE_TX_CHALLENGE_INVALID_WALLET",
      message: "Invalid wallet address for trade tx challenge.",
    });
  }

  const challengeResult = verifyTradeTxChallenge(
    challengeId,
    wallet,
    walletSignature,
  );

  if (!challengeResult.ok) {
    return jsonError({
      request,
      status: 403,
      code: challengeResult.code,
      message: challengeResult.message,
      recoveryHint:
        "Request a fresh challenge from /api/trade/tx/challenge and sign it with the connected wallet.",
    });
  }

  return null;
}

export type TensorBffWritePath = "tensor_rest" | "sdk";

export function resolveTensorTxWritePath(
  requested: string | null,
): TensorBffWritePath {
  const normalized = requested?.trim().toLowerCase();
  if (normalized === "sdk") return "sdk";
  if (normalized === "rest" || normalized === "tensor_rest") return "tensor_rest";
  if (isTensorReadConfigured()) return "tensor_rest";
  return "sdk";
}

export function resolveBuyWritePath(
  requested: string | null,
): TensorBffWritePath {
  return resolveTensorTxWritePath(requested);
}

export function resolveListWritePath(
  requested: string | null,
): TensorBffWritePath {
  return resolveTensorTxWritePath(requested);
}

export function resolveDelistWritePath(
  requested: string | null,
): TensorBffWritePath {
  return resolveTensorTxWritePath(requested);
}

export function parsePublicKeyParam(
  name: string,
  value: string | null,
): PublicKey {
  if (!value?.trim()) {
    throw new TensorBffError(`${name} is required.`, 400);
  }
  try {
    return new PublicKey(value.trim());
  } catch {
    throw new TensorBffError(`${name} must be a valid Solana public key.`, 400);
  }
}

export function parseLamportsParam(
  name: string,
  value: string | null,
): bigint {
  if (!value?.trim()) {
    throw new TensorBffError(`${name} is required.`, 400);
  }
  try {
    const lamports = BigInt(value.trim());
    if (lamports <= BigInt(0)) {
      throw new Error("non-positive");
    }
    return lamports;
  } catch {
    throw new TensorBffError(`${name} must be a positive integer (lamports).`, 400);
  }
}

/** Serialize legacy Transaction for wallet signing (matches Tensor REST tx shape). */
export function serializeLegacyTransaction(
  tx: Transaction,
  blockhash: string,
  options?: { lastValidBlockHeight?: number; feePayer?: PublicKey },
): { tx: string; blockhash: string; lastValidBlockHeight?: number } {
  tx.recentBlockhash = blockhash;
  tx.feePayer ??=
    options?.feePayer ??
    tx.instructions[0]?.keys.find((k) => k.isSigner)?.pubkey;
  if (!tx.feePayer) {
    throw new TensorBffError(
      "Unable to serialize transaction: fee payer is required.",
      500,
    );
  }
  return {
    tx: Buffer.from(
      tx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      }),
    ).toString("base64"),
    blockhash,
    ...(options?.lastValidBlockHeight != null
      ? { lastValidBlockHeight: options.lastValidBlockHeight }
      : {}),
  };
}

export function sdkTransactionResponse(
  tx: Transaction,
  blockhash: string,
  lastValidBlockHeight: number,
  feePayer: PublicKey,
): {
  txs: Array<{ tx: string; blockhash: string; lastValidBlockHeight: number }>;
  writePath: "sdk";
  sdkWriteEnabled: true;
} {
  const serialized = serializeLegacyTransaction(tx, blockhash, {
    lastValidBlockHeight,
    feePayer,
  });
  return {
    txs: [
      {
        tx: serialized.tx,
        blockhash: serialized.blockhash,
        lastValidBlockHeight,
      },
    ],
    writePath: "sdk",
    sdkWriteEnabled: true,
  };
}

export function restTransactionResponse(
  data: unknown,
): Record<string, unknown> {
  const payload =
    typeof data === "object" && data != null ? (data as Record<string, unknown>) : { txs: data };
  return {
    ...payload,
    writePath: "tensor_rest",
    sdkWriteEnabled: isTensorTradeWriteEnabled(),
  };
}

export async function getLatestBlockhashContext(connection: Connection): Promise<{
  blockhash: string;
  lastValidBlockHeight: number;
}> {
  return connection.getLatestBlockhash("confirmed");
}

export function transactionFromInstructions(
  ixs: TransactionInstruction[],
): Transaction {
  const tx = new Transaction();
  for (const ix of ixs) tx.add(ix);
  return tx;
}
