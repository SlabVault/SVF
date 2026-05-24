"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  collectionSlug: string;
  className?: string;
};

export function CollectionHoldersPanel({ collectionSlug: _collectionSlug, className }: Props) {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();

  return (
    <div
      className={cn(
        "overflow-hidden rounded border border-[#333] bg-[var(--trade-surface)]",
        className,
      )}
      role="region"
      aria-label="Holder distribution"
    >
      <div className="px-6 py-12 text-center">
        {!connected ? (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--tensor-white)]">
              Connect wallet to view holder distribution
            </p>
            <p className="mx-auto mt-2 max-w-md text-xs text-[var(--trade-muted)]">
              Holder concentration and wallet distribution for this collection are
              wallet-gated. Connect to preview your position once the index is live.
            </p>
            <Button
              type="button"
              className="tensor-btn-primary mt-5 !w-auto"
              onClick={() => setVisible(true)}
              data-growth-event="cta_connect_wallet_trade_holders"
              data-growth-context="trade_collection_holders_connect"
            >
              Connect wallet
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--tensor-white)]">
              Holder index coming soon
            </p>
            <p className="mx-auto mt-2 max-w-md text-xs text-[var(--trade-muted)]">
              Collection holder distribution will appear here when the Tensor holder
              index read path is enabled. No placeholder holder rows or synthetic
              percentages are shown.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
