"use client";

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

import { isTradeWriteEnabledClient } from "@/lib/trade/trade-modal";

import { tensorTransactionToast } from "./ui-layout";
import { fetchTensorTxRoute, signAndSendTensorTransactions } from "./use-tensor-tx";

type CancelBidArgs = {
  bidStateAddress: string;
};

export function useTensorCancelBid() {
  const { connection } = useConnection();
  const { publicKey, signAllTransactions, signMessage, connected } = useWallet();
  const [pending, setPending] = useState(false);
  const writeEnabled = isTradeWriteEnabledClient();

  const cancelBid = useCallback(
    async ({ bidStateAddress }: CancelBidArgs) => {
      if (!publicKey) {
        throw new Error("Connect a wallet on Solana to continue.");
      }
      if (!writeEnabled) {
        throw new Error("Tensor trade write path is disabled.");
      }
      const trimmed = bidStateAddress.trim();
      if (!trimmed) {
        throw new Error("Bid state address is required.");
      }

      setPending(true);
      try {
        const owner = publicKey.toBase58();
        const params = new URLSearchParams({
          bidStateAddress: trimmed,
          owner,
        });
        const data = await fetchTensorTxRoute("/api/trade/tx/cancel-bid", params, {
          wallet: owner,
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

  return { cancelBid, pending, writeEnabled, connected };
}
