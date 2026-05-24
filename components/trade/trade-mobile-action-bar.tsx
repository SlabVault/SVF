"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TradeMode = "buy" | "sell";

type Props = {
  priceSol: number;
  connected: boolean;
  onConnect: () => void;
  onBuy?: () => void;
  onList?: () => void;
  /** Floor or suggested list price shown in sell mode. */
  suggestedListPriceSol?: number;
  listingId: string;
  partnerCheckoutUrl?: string | null;
  partnerPrimaryCheckout?: boolean;
  showOnChainBuyCta?: boolean;
};

/** Sticky bottom BUY/SELL bar for item pages on mobile. */
export function TradeMobileActionBar({
  priceSol,
  connected,
  onConnect,
  onBuy,
  onList,
  suggestedListPriceSol,
  listingId,
  partnerCheckoutUrl = null,
  partnerPrimaryCheckout = false,
  showOnChainBuyCta = true,
}: Props) {
  const [mode, setMode] = useState<TradeMode>("buy");

  const handlePrimary = () => {
    if (mode === "buy" && partnerPrimaryCheckout && partnerCheckoutUrl) {
      return;
    }
    if (!connected) {
      onConnect();
      return;
    }
    if (mode === "buy") {
      onBuy?.();
    } else {
      onList?.();
    }
  };

  const showPartnerBuyOnMobile =
    mode === "buy" &&
    Boolean(partnerCheckoutUrl) &&
    (partnerPrimaryCheckout || !showOnChainBuyCta);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[45] border-t border-[#333] bg-[var(--tensor-black)]/95 px-3 py-2 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div
        className="mb-2 flex rounded border border-[#333] bg-[var(--trade-surface)] p-0.5"
        role="group"
        aria-label="Trade mode"
      >
        {(["buy", "sell"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={cn(
              "min-h-11 flex-1 rounded px-3 text-xs font-semibold uppercase tracking-wide transition-colors",
              mode === value
                ? "bg-[var(--trade-panel)] text-[var(--tensor-white)]"
                : "text-[var(--trade-muted)] hover:text-[var(--tensor-white)]",
            )}
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="min-w-0 shrink-0">
          <p className="text-[10px] uppercase tracking-wide text-[var(--trade-muted)]">
            {mode === "buy" ? "LISTED FOR" : "SELL MODE"}
          </p>
          <p className="font-mono text-sm font-semibold text-[var(--tensor-white)]">
            {mode === "buy"
              ? `${priceSol} SOL`
              : suggestedListPriceSol != null
                ? `${suggestedListPriceSol} SOL`
                : "Fixed price"}
          </p>
        </div>
        {showPartnerBuyOnMobile && partnerCheckoutUrl ? (
          <Button
            type="button"
            className={cn(
              "min-h-11 flex-1 !w-auto text-xs font-bold uppercase tracking-wide",
              partnerPrimaryCheckout
                ? "tensor-btn-primary"
                : "border border-[#333] bg-[var(--trade-panel)] text-[var(--tensor-white)] hover:bg-[var(--trade-surface)]",
            )}
            variant={partnerPrimaryCheckout ? "default" : "secondary"}
            asChild
          >
            <a
              href={partnerCheckoutUrl}
              target="_blank"
              rel="noreferrer"
              data-growth-event="cta_trade_partner_deep_link"
              data-growth-context={`trade_buy_partner:${listingId}`}
            >
              Open on partner ↗
            </a>
          </Button>
        ) : (
          <Button
            type="button"
            className="tensor-btn-primary min-h-11 flex-1 !w-auto text-xs font-bold uppercase tracking-wide"
            onClick={handlePrimary}
            data-growth-event={mode === "buy" ? "cta_trade_buy_now" : "cta_trade_list_for_sale"}
            data-growth-context={`trade_item:${listingId}`}
          >
            {!connected
              ? "CONNECT WALLET"
              : mode === "buy"
                ? "BUY NOW"
                : "LIST FOR SALE"}
          </Button>
        )}
      </div>
    </div>
  );
}
