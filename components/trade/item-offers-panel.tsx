"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  listingId: string;
  className?: string;
};

const OFFER_COLUMNS = ["Buyer", "Offer", "Expires", "Status", "Actions"] as const;

export function ItemOffersPanel({ listingId: _listingId, className }: Props) {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();

  return (
    <div
      className={cn(
        "overflow-hidden rounded border border-[#333] bg-[var(--trade-surface)]",
        className,
      )}
      role="region"
      aria-label="Item offers"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#333] bg-[var(--trade-panel)] px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--trade-muted)]">
          All offers on this item
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded border border-[#333] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--trade-muted)] hover:text-[var(--tensor-white)]"
            aria-label="Refresh offers"
            disabled
            title="Refresh — no item offers API yet"
          >
            Refresh
          </button>
          <span className="font-mono text-[10px] tabular-nums text-[var(--trade-muted)]">
            0 / 0
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#333] bg-[var(--trade-panel)] text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
              {OFFER_COLUMNS.map((column) => (
                <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!connected ? (
              <tr>
                <td colSpan={OFFER_COLUMNS.length} className="px-6 py-12 text-center">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[var(--tensor-white)]">
                    Connect wallet to view offers
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-xs text-[var(--trade-muted)]">
                    Open bids on this slab from your wallet and competing buyers will appear here
                    once connected. Use Make offer in the commerce stack to place a bid when write
                    is enabled.
                  </p>
                  <Button
                    type="button"
                    className="tensor-btn-primary mt-5 !w-auto"
                    onClick={() => setVisible(true)}
                    data-growth-event="cta_connect_wallet_trade_item_offers"
                    data-growth-context="trade_item_offers_connect"
                  >
                    Connect wallet
                  </Button>
                </td>
              </tr>
            ) : (
              <tr>
                <td colSpan={OFFER_COLUMNS.length} className="px-6 py-12 text-center">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[var(--tensor-white)]">
                    No offers on this item
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-xs text-[var(--trade-muted)]">
                    Indexed offers from Tensor TCM will appear here when the read path is enabled.
                    No placeholder rows are shown.
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
