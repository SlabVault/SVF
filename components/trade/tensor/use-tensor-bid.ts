"use client";

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { looksLikeSolanaMint } from "@/lib/trade-listings";
import { isTradeWriteEnabledClient } from "@/lib/trade/trade-modal";
import { storeTensorBidState } from "@/lib/trade/tensor-bid-session";

import { tensorTransactionToast } from "./ui-layout";
import { fetchTensorTxRoute, signAndSendTensorTransactions } from "./use-tensor-tx";

type BidArgs = {
  mint: string;
  priceSol: number;
  /** Bid expiry in seconds (Tensor `expireIn`). */
  expireInSeconds?: number;
};

type BidTxPayload = {
  txs?: Array<{ tx?: string; txV0?: string }>;
  bidState?: string;
  error?: string;
};

export function useTensorBid() {
  const { connection } = useConnection();
  const { publicKey, signAllTransactions, signMessage, connected } = useWallet();
  const [pending, setPending] = useState(false);
  const writeEnabled = isTradeWriteEnabledClient();

  const bid = useCallback(
    async ({ mint, priceSol, expireInSeconds }: BidArgs) => {
      if (!publicKey) {
        throw new Error("Connect a wallet on Solana to continue.");
      }
      if (!writeEnabled) {
        throw new Error("Tensor trade write path is disabled.");
      }
      const trimmedMint = mint.trim();
      if (!trimmedMint) {
        throw new Error("Mint address is required.");
      }
      if (!Number.isFinite(priceSol) || priceSol <= 0) {
        throw new Error("Bid price must be greater than zero.");
      }

      setPending(true);
      try {
        const owner = publicKey.toBase58();
        const price = Math.round(priceSol * LAMPORTS_PER_SOL).toString();
        const params = new URLSearchParams({ owner, mint: trimmedMint, price });
        if (expireInSeconds != null && expireInSeconds > 0) {
          params.set("expireIn", String(Math.floor(expireInSeconds)));
        }

        const data = (await fetchTensorTxRoute(
          "/api/trade/tx/bid",
          params,
          {
            wallet: owner,
            signMessage,
          },
        )) as BidTxPayload;
        await signAndSendTensorTransactions(
          connection,
          signAllTransactions,
          data.txs ?? [],
          tensorTransactionToast,
        );
        const bidState = data.bidState?.trim();
        if (bidState) {
          storeTensorBidState(trimmedMint, bidState);
        }
      } finally {
        setPending(false);
      }
    },
    [connection, publicKey, signAllTransactions, signMessage, writeEnabled],
  );

  return { bid, pending, writeEnabled, connected };
}
