"use client";

import { useId, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { TradeModalShell } from "@/components/trade/trade-modal-shell";
import { useTensorBid } from "@/components/trade/tensor/use-tensor-bid";
import { WalletButton } from "@/components/wallet-button";
import { Button } from "@/components/ui/button";
import {
  isTradeWriteEnabledClient,
  tradeWriteDisabledTooltip,
  type TradeModalListing,
} from "@/lib/trade/trade-modal";
import { extractCertNumber } from "@/lib/trade/extract-cert-number";
import { resolveTradeListingMint } from "@/lib/trade-listings";

const EXPIRY_OPTIONS = [
  { value: "7", label: "7 days", seconds: 7 * 24 * 60 * 60 },
  { value: "30", label: "30 days", seconds: 30 * 24 * 60 * 60 },
] as const;

type Props = TradeModalListing & {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
};

export function PlaceOfferModal({ open, onClose, listing, collectionSlug, onComplete }: Props) {
  const offerAmountId = useId();
  const expiryId = useId();
  const { connected } = useWallet();
  const writeEnabled = isTradeWriteEnabledClient();
  const { bid, pending } = useTensorBid();
  const [offerSol, setOfferSol] = useState("");
  const [expiryDays, setExpiryDays] = useState<(typeof EXPIRY_OPTIONS)[number]["value"]>("7");
  const [error, setError] = useState<string | null>(null);
  const cert = extractCertNumber(listing);
  const onChainMint = useMemo(() => resolveTradeListingMint(listing), [listing]);

  const parsedOffer = Number.parseFloat(offerSol);
  const hasValidOffer = Number.isFinite(parsedOffer) && parsedOffer > 0;
  const submitDisabled =
    !connected || !writeEnabled || !hasValidOffer || pending || !onChainMint;

  const handleSubmit = async () => {
    setError(null);
    if (!onChainMint) {
      setError("Listing missing on-chain mint for bid.");
      return;
    }
    try {
      const expiry = EXPIRY_OPTIONS.find((option) => option.value === expiryDays);
      await bid({
        mint: onChainMint,
        priceSol: parsedOffer,
        expireInSeconds: expiry?.seconds,
      });
      onComplete?.();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Bid failed.");
    }
  };

  return (
    <TradeModalShell
      open={open}
      onClose={onClose}
      title="Place offer"
      description={listing.name}
      footer={
        <div className="space-y-2">
          {!connected ? (
            <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
              <p className="text-[11px] text-[var(--trade-muted)]">
                Connect a wallet to place an offer.
              </p>
              <WalletButton />
            </div>
          ) : null}
          {error ? (
            <p className="text-[11px] text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            className="tensor-btn-primary h-8 w-full text-xs"
            disabled={submitDisabled}
            aria-disabled={submitDisabled}
            title={
              !writeEnabled
                ? tradeWriteDisabledTooltip()
                : connected && writeEnabled && !onChainMint
                  ? "Listing missing on-chain mint for bid."
                  : undefined
            }
            data-growth-event="cta_trade_offer_submit"
            data-growth-context={`trade_offer:${listing.id}:${collectionSlug}`}
            onClick={() => void handleSubmit()}
          >
            {pending ? "Signing bid…" : writeEnabled ? "Submit offer" : "Submit offer (write path pending)"}
          </Button>
          {connected && !writeEnabled ? (
            <p className="text-center text-[10px] text-[var(--trade-muted)]">
              On-chain bids route through Tensor when{" "}
              <code className="text-[10px]">TENSOR_TRADE_WRITE_ENABLED</code> ships.
            </p>
          ) : null}
          {connected && writeEnabled && !onChainMint ? (
            <p className="text-center text-[10px] text-[var(--trade-muted)]">
              On-chain bid needs the vaulted NFT mint on the listing.
            </p>
          ) : null}
        </div>
      }
    >
      {cert ? (
        <p className="font-mono text-[10px] text-[var(--trade-muted)]">Cert #{cert}</p>
      ) : null}

      <div className="space-y-1">
        <label
          htmlFor={offerAmountId}
          className="text-[11px] font-medium text-[var(--tensor-white)]"
        >
          Offer amount (SOL)
        </label>
        <input
          id={offerAmountId}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={offerSol}
          onChange={(event) => setOfferSol(event.target.value)}
          className="h-8 w-full rounded-md border border-[#333] bg-[var(--trade-surface)] px-2.5 font-mono text-xs text-[var(--tensor-white)] outline-none ring-[var(--tensor-accent)]/40 placeholder:text-[var(--trade-muted)] focus:border-[var(--tensor-accent)]/50 focus:ring-2"
        />
        <p className="font-mono text-[10px] text-[var(--trade-muted)]">
          Listed ask: {listing.askSol} ◎
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor={expiryId} className="text-[11px] font-medium text-[var(--tensor-white)]">
          Expiry
        </label>
        <select
          id={expiryId}
          value={expiryDays}
          onChange={(event) =>
            setExpiryDays(event.target.value as (typeof EXPIRY_OPTIONS)[number]["value"])
          }
          className="h-8 w-full rounded-md border border-[#333] bg-[var(--trade-surface)] px-2.5 text-xs text-[var(--tensor-white)] outline-none ring-[var(--tensor-accent)]/40 focus:border-[var(--tensor-accent)]/50 focus:ring-2"
        >
          {EXPIRY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-[10px] leading-snug text-[var(--trade-muted)]">
          Escrowed bids stay active on Tensor until expiry or the seller accepts.
        </p>
      </div>
    </TradeModalShell>
  );
}
