"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  collectionSlug: string;
  className?: string;
};

const ORDER_COLUMNS = [
  "Type",
  "Traits",
  "SOL",
  "Buy Now",
  "Sell Now",
  "NFTs",
  "Bought",
  "Sold",
  "Created",
  "Actions",
] as const;

export function CollectionOrdersPanel({ collectionSlug: _collectionSlug, className }: Props) {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [nonEmptyOnly, setNonEmptyOnly] = useState(false);

  return (
    <div
      className={cn(
        "overflow-hidden rounded border border-[#333] bg-[var(--trade-surface)]",
        className,
      )}
      role="region"
      aria-label="Collection orders"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#333] bg-[var(--trade-panel)] px-3 py-2">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tensor-accent)] hover:underline"
            aria-current="page"
          >
            All Collections
          </button>
          <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-[var(--trade-muted)]">
            <input
              type="checkbox"
              checked={nonEmptyOnly}
              onChange={(event) => setNonEmptyOnly(event.target.checked)}
              className="size-3 rounded border-[#555] bg-[var(--trade-surface)] accent-[var(--tensor-accent)]"
            />
            Non-empty only
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded border border-[#333] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--trade-muted)] hover:text-[var(--tensor-white)]"
            aria-label="Filter orders"
            disabled
            title="Filter — coming soon"
          >
            Filter
          </button>
          <button
            type="button"
            className="rounded border border-[#333] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--trade-muted)] hover:text-[var(--tensor-white)]"
            aria-label="Refresh orders"
            disabled
            title="Refresh — no orders API yet"
          >
            Refresh
          </button>
          <span className="font-mono text-[10px] tabular-nums text-[var(--trade-muted)]">
            0 / 0
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#333] bg-[var(--trade-panel)] text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
              {ORDER_COLUMNS.map((column) => (
                <th key={column} className="px-3 py-2 font-semibold whitespace-nowrap">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!connected ? (
              <tr>
                <td colSpan={ORDER_COLUMNS.length} className="px-6 py-12 text-center">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[var(--tensor-white)]">
                    Connect wallet to view your orders
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-xs text-[var(--trade-muted)]">
                    Your open bids and listings for this collection will appear here once
                    connected. Collection bid pools from other wallets are on the BIDS tab.
                  </p>
                  <Button
                    type="button"
                    className="tensor-btn-primary mt-5 !w-auto"
                    onClick={() => setVisible(true)}
                    data-growth-event="cta_connect_wallet_trade_orders"
                    data-growth-context="trade_collection_orders_connect"
                  >
                    Connect wallet
                  </Button>
                </td>
              </tr>
            ) : (
              <tr>
                <td colSpan={ORDER_COLUMNS.length} className="px-6 py-12 text-center">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[var(--tensor-white)]">
                    No open orders in this collection
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-xs text-[var(--trade-muted)]">
                    Wallet-linked orders will appear here when the read path is enabled. No
                    placeholder rows are shown.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
