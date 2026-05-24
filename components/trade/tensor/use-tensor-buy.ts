"use client";

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

import { getTradeCollectionBySlug } from "@/lib/onchain/collections";
import { logTensorFillSignatures } from "@/lib/onchain/tensor-fill-verify";
import type { TradeListing } from "@/lib/trade-listings";
import { isTradeWriteEnabledClient } from "@/lib/trade/trade-modal";

import { tensorTransactionToast } from "./ui-layout";
import type { TensorNft } from "./types";
import {
  deserializeTensorTransactions,
  fetchTensorTxRoute,
  signAndSendTensorTransactions,
} from "./use-tensor-tx";

export { deserializeTensorTransactions } from "./use-tensor-tx";

/** Query params for /api/trade/tx/buy — always SDK fill (avoids REST default when read API key is set). */
export function buildTensorBuyTxSearchParams(input: {
  buyer: string;
  mint: string;
  maxPrice: string;
  owner?: string;
  listState?: string;
}): URLSearchParams {
  const params = new URLSearchParams({
    buyer: input.buyer,
    mint: input.mint,
    maxPrice: input.maxPrice,
    writePath: "sdk",
  });
  if (input.owner?.trim()) params.set("owner", input.owner.trim());
  if (input.listState?.trim()) params.set("listState", input.listState.trim());
  return params;
}

export function resolvesOnChainSettlement(
  listing: TradeListing | undefined,
  collectionSlug: string,
): boolean {
  const mode =
    listing?.settlementMode ??
    getTradeCollectionBySlug(collectionSlug)?.settlementMode;
  return mode !== "partner_site";
}

export function useTensorBuy() {
  const { connection } = useConnection();
  const { publicKey, signAllTransactions, signMessage, connected } = useWallet();
  const [pending, setPending] = useState(false);
  const writeEnabled = isTradeWriteEnabledClient();

  const canBuyOnChain = useCallback(
    (nft: TensorNft, listing?: TradeListing, collectionSlug?: string) => {
      const slug = collectionSlug ?? nft.slug;
      if (!resolvesOnChainSettlement(listing, slug)) return false;
      const hasSeller = Boolean(nft.listing.seller?.trim());
      const hasListState = Boolean(nft.listing.listState?.trim());
      return (
        writeEnabled &&
        connected &&
        Boolean(nft.listing.price) &&
        Boolean(nft.mint?.trim()) &&
        (hasSeller || hasListState)
      );
    },
    [writeEnabled, connected],
  );

  const buy = useCallback(
    async (nft: TensorNft, collectionSlug?: string) => {
      if (!publicKey) {
        throw new Error("Connect a wallet on Solana to continue.");
      }
      if (!nft.listing.price) {
        throw new Error("Listing missing price.");
      }
      const seller = nft.listing.seller?.trim();
      const listState = nft.listing.listState?.trim();
      if (!seller && !listState) {
        throw new Error("Listing missing seller or listState.");
      }

      setPending(true);
      try {
        const params = buildTensorBuyTxSearchParams({
          buyer: publicKey.toBase58(),
          mint: nft.mint,
          maxPrice: nft.listing.price,
          owner: seller,
          listState,
        });

        const data = await fetchTensorTxRoute("/api/trade/tx/buy", params, {
          wallet: publicKey.toBase58(),
          signMessage,
        });
        const signatures = await signAndSendTensorTransactions(
          connection,
          signAllTransactions,
          data.txs ?? [],
          tensorTransactionToast,
        );
        const verify = logTensorFillSignatures(signatures, {
          mint: nft.mint,
          buyer: publicKey.toBase58(),
        });
        if (!verify.ok) {
          console.warn("[tensor-fill-verify] post-buy verify failed:", verify.reason, {
            mint: nft.mint,
            buyer: publicKey.toBase58(),
            signatures,
          });
        }
      } finally {
        setPending(false);
      }
    },
    [connection, publicKey, signAllTransactions, signMessage],
  );

  return { buy, pending, writeEnabled, canBuyOnChain, connected };
}

export function formatTensorAskSol(askSol: number): string {
  return Number(askSol.toPrecision(4)).toString();
}

export function askSolToLamports(askSol: number): string {
  return Math.round(askSol * 1_000_000_000).toString();
}
