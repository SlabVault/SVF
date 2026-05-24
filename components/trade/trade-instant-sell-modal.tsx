"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { ListForSaleModal } from "@/components/trade/list-for-sale-modal";
import { TradeModalShell } from "@/components/trade/trade-modal-shell";
import { Button } from "@/components/ui/button";
import {
  isTradeWriteEnabledClient,
  tradeWriteDisabledTooltip,
} from "@/lib/trade/trade-modal";

type Props = {
  open: boolean;
  onClose: () => void;
  floorSol: number;
  collectionName: string;
};

/** Instant-sell tile modal — list at floor via TCM; AMM pool sell ships Phase 3. */
export function TradeInstantSellModal({
  open,
  onClose,
  floorSol,
  collectionName,
}: Props) {
  const { connected } = useWallet();
  const writeEnabled = isTradeWriteEnabledClient();
  const [listOpen, setListOpen] = useState(false);
  const listDisabled = !writeEnabled || !connected;

  return (
    <>
      <TradeModalShell
        open={open}
        onClose={onClose}
        title="Instant sell"
        description={`Sell into the ${collectionName} pool at floor price.`}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              type="button"
              className="tensor-btn-primary h-8 text-xs"
              disabled={listDisabled}
              title={listDisabled ? tradeWriteDisabledTooltip() : undefined}
              onClick={() => setListOpen(true)}
            >
              List at floor
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-[11px]">
          <p className="font-mono text-lg font-bold text-[var(--tensor-white)]">
            {floorSol} ◎
          </p>
          <p className="text-[var(--trade-muted)]">
            List at floor uses Tensor TCM via{" "}
            <code className="text-[10px]">/api/trade/tx/list</code>. Tensor AMM instant
            sell-to-pool ships when collection liquidity is live.
          </p>
          {!writeEnabled ? (
            <p className="text-[10px] text-[var(--trade-muted)]">
              Enable{" "}
              <code className="text-[10px]">NEXT_PUBLIC_TENSOR_TRADE_WRITE_ENABLED</code> on
              staging to sign list txs.
            </p>
          ) : null}
        </div>
      </TradeModalShell>

      <ListForSaleModal
        open={listOpen}
        onClose={() => {
          setListOpen(false);
          onClose();
        }}
        itemLabel={`List at floor — ${collectionName}`}
        suggestedPriceSol={floorSol}
      />
    </>
  );
}
