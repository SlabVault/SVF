"use client";

import {
  Transaction,
  VersionedTransaction,
  type Connection,
} from "@solana/web3.js";

import {
  isTradeWriteDisabledBffPayload,
  isTradeTxWalletChallengeRequiredClient,
  resolveTradeTxBffErrorMessage,
  TRADE_WRITE_DISABLED_BFF_CODE,
  type TradeTxBffErrorPayload,
} from "@/lib/trade/trade-modal";
import { buildTradeTxChallengePayload } from "@/lib/wallet-trade-tx-challenge";

export type RawTensorTx = {
  tx?: string | { data: number[] };
  txV0?: string | { data: number[] };
};

export type TensorTxPayload = TradeTxBffErrorPayload & {
  txs?: RawTensorTx[];
};

export class TensorTxRouteError extends Error {
  readonly code?: string;
  readonly recoveryHint?: string;
  readonly writeDisabled: boolean;

  constructor(payload: TradeTxBffErrorPayload) {
    super(resolveTradeTxBffErrorMessage(payload));
    this.name = "TensorTxRouteError";
    this.code = payload.code;
    this.recoveryHint = payload.recoveryHint;
    this.writeDisabled = isTradeWriteDisabledBffPayload(payload);
  }
}

export function isTradeWriteDisabledRouteError(error: unknown): boolean {
  if (error instanceof TensorTxRouteError) {
    return error.writeDisabled;
  }
  return false;
}

export { TRADE_WRITE_DISABLED_BFF_CODE };

function bytesFromTensorPayload(value: string | { data: number[] }): Uint8Array {
  if (typeof value === "string") {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return Uint8Array.from(value.data);
}

/** Deserialize Tensor REST / SDK BFF tx payloads (vendor NftCard pattern + base64). */
export function deserializeTensorTransactions(
  txs: RawTensorTx[],
): Array<Transaction | VersionedTransaction> {
  return txs.map((raw) => {
    if (raw.txV0) {
      return VersionedTransaction.deserialize(bytesFromTensorPayload(raw.txV0));
    }
    if (raw.tx) {
      return Transaction.from(bytesFromTensorPayload(raw.tx));
    }
    throw new Error("No transaction payload in Tensor response.");
  });
}

export type FetchTensorTxOptions = {
  wallet: string;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
};

export async function fetchTensorTxRoute(
  path: string,
  params: URLSearchParams,
  options?: FetchTensorTxOptions,
): Promise<TensorTxPayload> {
  if (isTradeTxWalletChallengeRequiredClient()) {
    const wallet = options?.wallet?.trim();
    if (!wallet) {
      throw new Error("Wallet address is required for trade tx challenge.");
    }

    const challengeResult = await buildTradeTxChallengePayload(
      wallet,
      options?.signMessage,
    );

    if (challengeResult && "error" in challengeResult) {
      throw new Error(challengeResult.error);
    }

    if (!challengeResult) {
      throw new Error(
        "Wallet message signing is required. Use a wallet that supports signMessage (Phantom or Solflare).",
      );
    }

    params.set("challengeId", challengeResult.challengeId);
    params.set("walletSignature", challengeResult.walletSignature);
  }

  const response = await fetch(`${path}?${params.toString()}`);
  const data = (await response.json()) as TensorTxPayload;
  if (!response.ok) {
    throw new TensorTxRouteError(data);
  }
  return data;
}

type SignAllTransactions = (
  transactions: Array<Transaction | VersionedTransaction>,
) => Promise<Array<Transaction | VersionedTransaction>>;

export async function signAndSendTensorTransactions(
  connection: Connection,
  signAllTransactions: SignAllTransactions | undefined,
  txs: RawTensorTx[],
  onConfirmed?: (signature: string) => void,
): Promise<string[]> {
  if (!signAllTransactions) {
    throw new Error("Connect a wallet on Solana to continue.");
  }

  const txsToSign = deserializeTensorTransactions(txs);
  if (txsToSign.length === 0) {
    throw new Error("No transactions returned from Tensor route.");
  }

  const signed = await signAllTransactions(txsToSign);
  const signatures: string[] = [];
  for (const tx of signed) {
    const sig =
      tx instanceof VersionedTransaction
        ? await connection.sendTransaction(tx)
        : await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(sig, "confirmed");
    signatures.push(sig);
    onConfirmed?.(sig);
  }
  return signatures;
}