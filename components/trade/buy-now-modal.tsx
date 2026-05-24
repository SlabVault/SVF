"use client";

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { PlatformBadge } from "@/components/platform-badge";
import { TradeModalShell } from "@/components/trade/trade-modal-shell";
import { mapTradeListingToTensorNft, resolveOnChainBuyBlockReason } from "@/components/trade/tensor/map-listing";
import { resolvesOnChainSettlement, useTensorBuy } from "@/components/trade/tensor/use-tensor-buy";
import { WalletButton } from "@/components/wallet-button";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/format";
import {
  DEFAULT_TRADE_ROYALTY_PCT,
  formatListedAskUsd,
  formatTradeRoyaltySol,
  formatTradeTotalSol,
  isTradeWriteEnabledClient,
  resolveTradePartnerBadge,
  resolveTradeVenueKind,
  tradeListingShowsPartnerBuyLink,
  tradeListingUsesPartnerSiteSettlement,
  tradeWriteDisabledTooltip,
  type TradeModalListing,
} from "@/lib/trade/trade-modal";
import { slugToPartnerPlatform, resolvePartnerDeepLink } from "@/lib/trade/partner-deep-link";
import { extractCertNumber } from "@/lib/trade/extract-cert-number";

type Props = TradeModalListing & {
  open: boolean;
  onClose: () => void;
  solPriceUsd?: number | null;
};

function PriceRow({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className={muted ? "text-[var(--trade-muted)]" : "text-[var(--tensor-white)]/90"}>
        {label}
      </span>
      <span className="font-mono tabular-nums text-[var(--tensor-white)]">{value}</span>
    </div>
  );
}

export function BuyNowModal({ open, onClose, listing, collectionSlug, solPriceUsd }: Props) {
  const { connected } = useWallet();
  const writeEnabled = isTradeWriteEnabledClient();
  const { buy, pending, canBuyOnChain } = useTensorBuy();
  const [error, setError] = useState<string | null>(null);
  const nft = useMemo(
    () => mapTradeListingToTensorNft(listing, collectionSlug),
    [listing, collectionSlug],
  );
  const onChainBuy = canBuyOnChain(nft, listing, collectionSlug);
  const venue = resolveTradeVenueKind(collectionSlug);
  const partner = resolveTradePartnerBadge(collectionSlug);
  const onChainSettlement = resolvesOnChainSettlement(listing, collectionSlug);
  const onChainBlockReason = resolveOnChainBuyBlockReason(listing, onChainSettlement);
  const partnerPlatform = slugToPartnerPlatform(collectionSlug);
  const partnerCheckoutUrl =
    partner.kind === "external" && partnerPlatform
      ? resolvePartnerDeepLink(listing, partnerPlatform)
      : listing.vaultedUrl?.trim() ?? null;
  const isPartnerPrimaryCheckout =
    !onChainBuy &&
    Boolean(partnerCheckoutUrl) &&
    (tradeListingUsesPartnerSiteSettlement(listing, collectionSlug) ||
      tradeListingShowsPartnerBuyLink(listing, collectionSlug));

  const cert = extractCertNumber(listing);
  const royaltySol = formatTradeRoyaltySol(listing.askSol);
  const totalSol = formatTradeTotalSol(listing.askSol);
  const listedUsd = formatListedAskUsd(listing.askSol, solPriceUsd);
  const listedValue =
    listedUsd != null
      ? `${listing.askSol} ◎ (${formatUsd(listedUsd)})`
      : `${listing.askSol} ◎`;

  useEffect(() => {
    if (!open) setError(null);
  }, [open]);

  const confirmDisabled =
    !connected ||
    !writeEnabled ||
    pending ||
    (writeEnabled && connected && !onChainBuy);

  const handleConfirm = async () => {
    setError(null);
    try {
      await buy(nft, collectionSlug);
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Buy failed.");
    }
  };

  return (
    <TradeModalShell
      open={open}
      onClose={onClose}
      title="Buy now"
      description={listing.name}
      footer={
        <div className="space-y-2">
          {!connected && !isPartnerPrimaryCheckout ? (
            <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
              <p className="text-[11px] text-[var(--trade-muted)]">
                Connect a wallet on Solana to continue.
              </p>
              <WalletButton />
            </div>
          ) : null}
          {error ? (
            <p className="text-[11px] text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          {isPartnerPrimaryCheckout ? (
            <>
              <Button
                type="button"
                className="tensor-btn-primary h-8 w-full text-xs"
                asChild
              >
                <a
                  href={partnerCheckoutUrl!}
                  target="_blank"
                  rel="noreferrer"
                  data-growth-event="cta_trade_partner_deep_link"
                  data-growth-context={`trade_buy_partner:${listing.id}`}
                >
                  Open on partner ↗
                </a>
              </Button>
              <p className="text-center text-[10px] text-[var(--trade-muted)]" role="status">
                This listing settles on the partner site. On-chain buy is not available here.
              </p>
            </>
          ) : (
            <>
              <Button
                type="button"
                className="tensor-btn-primary h-8 w-full text-xs"
                disabled={confirmDisabled}
                aria-disabled={confirmDisabled}
                title={
                  !writeEnabled
                    ? tradeWriteDisabledTooltip()
                    : onChainBlockReason ?? undefined
                }
                data-growth-event="cta_trade_buy_confirm"
                data-growth-context={`trade_buy:${listing.id}`}
                onClick={() => void handleConfirm()}
              >
                {pending
                  ? "Signing…"
                  : writeEnabled
                    ? "Confirm buy"
                    : partner.kind === "external"
                      ? "Buy on TCM (when you own the NFT)"
                      : "Confirm buy (write path pending)"}
              </Button>
              {partner.kind === "external" && partnerCheckoutUrl ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 w-full text-xs"
                  asChild
                >
                  <a
                    href={partnerCheckoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    data-growth-event="cta_trade_partner_deep_link"
                    data-growth-context={`trade_buy_partner:${listing.id}`}
                  >
                    Open on partner ↗
                  </a>
                </Button>
              ) : null}
              {connected && !writeEnabled ? (
                <p className="text-center text-[10px] text-[var(--trade-muted)]">
                  On-chain fill routes through Tensor when{" "}
                  <code className="text-[10px]">TENSOR_TRADE_WRITE_ENABLED</code> ships.
                </p>
              ) : null}
              {connected && writeEnabled && onChainBlockReason ? (
                <p className="text-center text-[10px] text-[var(--trade-muted)]" role="status">
                  {onChainBlockReason} Use partner checkout below when settlement is off-chain.
                </p>
              ) : null}
            </>
          )}
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {cert ? (
          <span className="rounded bg-[var(--trade-surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--trade-muted)]">
            #{cert}
          </span>
        ) : null}
        {partner.kind === "slabvault" ? (
          <PlatformBadge kind="slabvault" className="scale-90" />
        ) : (
          <PlatformBadge
            kind="external"
            externalSource={partner.source}
            className="scale-90"
          />
        )}
        <span className="text-[10px] uppercase tracking-wide text-[var(--trade-muted)]">
          {venue === "slabvault"
            ? "SlabVault treasury"
            : venue === "tensor"
              ? "Tensor marketplace"
              : "Partner marketplace — deep link checkout"}
        </span>
      </div>

      <div className="space-y-0.5 rounded-md border border-[#333] bg-[var(--trade-surface)] p-2">
        <PriceRow label="Listed price" value={listedValue} />
        <PriceRow
          label={`Royalty (${DEFAULT_TRADE_ROYALTY_PCT}%)`}
          value={`${royaltySol} SOL`}
          muted
        />
        <div className="my-1 border-t border-[#333]" />
        <PriceRow label="Total" value={`${totalSol} SOL`} />
      </div>

      <p className="text-[10px] leading-snug text-[var(--trade-muted)]">
        {DEFAULT_TRADE_ROYALTY_PCT}% royalty ({royaltySol} SOL) is included in the total
        above.
      </p>

      <p className="text-[10px] leading-snug text-[var(--trade-muted)]">
        Physical vaulted slabs may require fulfillment steps after on-chain settlement. Routes
        through <code className="text-[10px]">/api/trade/tx/buy</code> when write is enabled.
      </p>
    </TradeModalShell>
  );
}
