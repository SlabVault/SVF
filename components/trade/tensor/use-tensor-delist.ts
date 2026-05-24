"use client";

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

import { isTradeWriteEnabledClient } from "@/lib/trade/trade-modal";

import { tensorTransactionToast } from "./ui-layout";
import { fetchTensorTxRoute, signAndSendTensorTransactions } from "./use-tensor-tx";

/** Query params for /api/trade/tx/delist — SDK path when server has no Tensor API key. */
export function buildTensorDelistTxSearchParams(input: {
  owner: string;
  mint: string;
}): URLSearchParams {
  return new URLSearchParams({
    owner: input.owner,
    mint: input.mint,
    writePath: "sdk",
  });
}

type DelistArgs = {
  mint: string;
};

export function useTensorDelist() {
  const { connection } = useConnection();
  const { publicKey, signAllTransactions, signMessage, connected } = useWallet();
  const [pending, setPending] = useState(false);
  const writeEnabled = isTradeWriteEnabledClient();

  const delist = useCallback(
    async ({ mint }: DelistArgs) => {
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

      setPending(true);
      try {
        const params = buildTensorDelistTxSearchParams({
          owner: publicKey.toBase58(),
          mint: trimmedMint,
        });
        const data = await fetchTensorTxRoute("/api/trade/tx/delist", params, {
          wallet: publicKey.toBase58(),
          signMessage,
        });
        await signAndSendTensorTransactions(
          connection,
          signAllTransactions,
          data.txs ?? [],
          tensorTransactionToast,
        );
      } finally {
        setPending(false);
      }
    },
    [connection, publicKey, signAllTransactions, signMessage, writeEnabled],
  );

  const delistMany = useCallback(
    async (mints: string[]) => {
      const unique = [...new Set(mints.map((m) => m.trim()).filter(Boolean))];
      if (unique.length === 0) {
        throw new Error("Select at least one listed slab with a mint address.");
      }
      for (const mint of unique) {
        await delist({ mint });
      }
    },
    [delist],
  );

  return { delist, delistMany, pending, writeEnabled, connected };
}
