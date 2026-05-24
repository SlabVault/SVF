"use client";

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { isTradeWriteEnabledClient } from "@/lib/trade/trade-modal";

import { tensorTransactionToast } from "./ui-layout";
import { fetchTensorTxRoute, signAndSendTensorTransactions } from "./use-tensor-tx";

/** Query params for /api/trade/tx/list — always SDK fill (avoids REST default when read API key is set). */
export function buildTensorListTxSearchParams(input: {
  owner: string;
  mint: string;
  price: string;
}): URLSearchParams {
  return new URLSearchParams({
    owner: input.owner,
    mint: input.mint,
    price: input.price,
    writePath: "sdk",
  });
}

type ListArgs = {
  mint: string;
  priceSol: number;
};

export function useTensorList() {
  const { connection } = useConnection();
  const { publicKey, signAllTransactions, signMessage, connected } = useWallet();
  const [pending, setPending] = useState(false);
  const writeEnabled = isTradeWriteEnabledClient();

  const list = useCallback(
    async ({ mint, priceSol }: ListArgs) => {
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
        throw new Error("List price must be greater than zero.");
      }

      setPending(true);
      try {
        const params = buildTensorListTxSearchParams({
          owner: publicKey.toBase58(),
          mint: trimmedMint,
          price: Math.round(priceSol * LAMPORTS_PER_SOL).toString(),
        });
        const data = await fetchTensorTxRoute("/api/trade/tx/list", params, {
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

  return { list, pending, writeEnabled, connected };
}
