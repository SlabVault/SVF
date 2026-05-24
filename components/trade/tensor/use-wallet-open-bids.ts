"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import {
  mergeSessionWalletBids,
  type WalletOpenBid,
} from "@/lib/trade/wallet-bids";

type Options = {
  /** When set, BFF resolves Tensor collId and filters bids for this desk collection. */
  collectionSlug?: string;
  /** When false, skips fetch (e.g. inactive tab). Defaults true when wallet connected. */
  enabled?: boolean;
  /** Limit session fallback merge to mints in this collection listing set. */
  collectionMints?: string[];
};

export function useWalletOpenBids(options?: Options) {
  const { connected, publicKey } = useWallet();
  const [bids, setBids] = useState<WalletOpenBid[]>([]);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const enabled = options?.enabled ?? connected;
  const owner = publicKey?.toBase58() ?? null;

  const refresh = useCallback(async () => {
    if (!owner) {
      setBids([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ owner });
      if (options?.collectionSlug) {
        params.set("collectionSlug", options.collectionSlug);
      }

      const response = await fetch(`/api/trade/wallet/bids?${params.toString()}`);
      const data = (await response.json()) as {
        bids?: WalletOpenBid[];
        configured?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load open bids.");
      }

      const apiBids = data.bids ?? [];
      const mintFilter =
        options?.collectionMints && options.collectionMints.length > 0
          ? options.collectionMints
          : undefined;

      setConfigured(data.configured ?? true);
      setBids(mergeSessionWalletBids(apiBids, { mints: mintFilter }));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load bids.");
      setBids(
        mergeSessionWalletBids([], {
          mints:
            options?.collectionMints && options.collectionMints.length > 0
              ? options.collectionMints
              : undefined,
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [owner, options?.collectionSlug, options?.collectionMints]);

  useEffect(() => {
    if (!connected || !owner || !enabled) {
      setBids([]);
      setLoading(false);
      return;
    }

    void refresh();
  }, [connected, owner, enabled, refresh]);

  return {
    bids,
    loading,
    configured,
    error,
    refresh,
    connected,
  };
}
