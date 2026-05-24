"use client";

import Link from "next/link";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

import { BuyNowModal } from "@/components/trade/buy-now-modal";
import { PlaceOfferModal } from "@/components/trade/place-offer-modal";
import { resolveListingVenuePartner, VenueBadge } from "@/components/trade/venue-badge";
import { SlabImage } from "@/components/slab-image";
import { TRADE_ROUTES } from "@/lib/trade-routes";
import type { TradeListing } from "@/lib/trade-listings";
import {
  isTradeWriteEnabledClient,
  resolveTradeListingPartnerCheckoutUrl,
  tradeListingShowsPartnerBuyLink,
  tradeWriteDisabledTooltip,
} from "@/lib/trade/trade-modal";

import {
  mapTradeListingToTensorNft,
  resolveOnChainBuyBlockReason,
} from "./map-listing";
import type { TensorNft } from "./types";
import { resolvesOnChainSettlement, useTensorBuy } from "./use-tensor-buy";

type Props = {
  nft: TensorNft;
  listing: TradeListing;
  collectionSlug: string;
  priority?: boolean;
};

function gateTitle(writeEnabled: boolean, connected: boolean, extra?: string): string | undefined {
  if (!writeEnabled) return tradeWriteDisabledTooltip();
  if (!connected) return "Connect a wallet on Solana to continue.";
  return extra;
}

/**
 * Ported from vendor/marketplace-nextjs-template/web/components/ui/NftCard.tsx
 * Buy opens BuyNowModal for price breakdown and write gates before on-chain attempt.
 */
export function TensorNftCard({ nft, listing, collectionSlug, priority = false }: Props) {
  const { name, imageUri, askSol, rank } = nft;
  const venuePartner = resolveListingVenuePartner(listing, collectionSlug);
  const href = `${TRADE_ROUTES.slab(nft.certOrMint)}?collection=${encodeURIComponent(collectionSlug)}`;
  const [buyOpen, setBuyOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const writeEnabled = isTradeWriteEnabledClient();
  const { pending, canBuyOnChain } = useTensorBuy();
  const onChainSettlement = resolvesOnChainSettlement(listing, collectionSlug);
  const listed = nft.listing.price != null;
  const onChainBlockReason = resolveOnChainBuyBlockReason(listing, onChainSettlement);
  const missingOnChainSellerMeta = Boolean(onChainBlockReason) && listed;
  const onChainBuy = canBuyOnChain(nft, listing, collectionSlug);
  const partnerCheckoutUrl = resolveTradeListingPartnerCheckoutUrl(listing, collectionSlug);
  const showPartnerBuyLink =
    listed &&
    !onChainBuy &&
    Boolean(partnerCheckoutUrl) &&
    tradeListingShowsPartnerBuyLink(listing, collectionSlug);
  const buyDisabled = !writeEnabled || pending || missingOnChainSellerMeta;
  const buyTitle = gateTitle(writeEnabled, connected, onChainBlockReason ?? undefined);
  const alternateAsks = listing.alternateVenueAsks ?? [];
  const hasAlternateVenues = alternateAsks.length >= 1;
  const bestAlternateAskSol = hasAlternateVenues
    ? Math.min(...alternateAsks.map((alt) => alt.askSol))
    : null;
  const compareHref = `${href}&tab=compare`;

  const handleBuy = () => {
    if (!connected) {
      setVisible(true);
      return;
    }
    if (buyDisabled) return;
    setBuyOpen(true);
  };

  return (
    <article className="nft-card trade-listing-card text-[11px]">
      <Link
        href={href}
        className="relative block aspect-square overflow-hidden rounded-md bg-[var(--trade-surface)]"
        data-growth-event="trade_listing_open"
        data-growth-context={`trade_slab:${nft.mint}`}
      >
        <SlabImage
          src={imageUri}
          alt={name}
          className="nft-card__image h-full w-full object-cover"
          priority={priority}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-1 p-1">
          <span className="trade-rank-badge rounded bg-[var(--tensor-black)]/85 px-1 py-0.5 font-mono text-[9px] text-[var(--tensor-white)]">
            {nft.grade ?? nft.certOrMint.slice(0, 6)}
          </span>
          {rank != null ? (
            <span className="trade-rank-badge trade-rank-badge--rank rounded bg-[var(--tensor-black)]/85 px-1 py-0.5 font-mono text-[9px] font-bold tabular-nums text-[var(--tensor-white)]">
              #{rank}
            </span>
          ) : null}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end p-1">
          <VenueBadge partner={venuePartner} className="trade-card-venue scale-[0.8]" />
        </div>
      </Link>

      <h2 className="nft-card__title mt-1.5 truncate px-0.5 text-[10px] font-medium leading-tight">
        {name}
      </h2>

      <div className="mt-1 space-y-1 px-0.5 pb-0.5">
        <div className="flex flex-wrap items-center gap-1">
          <p className="font-mono text-sm font-bold tabular-nums leading-none">{askSol} ◎</p>
          {hasAlternateVenues && bestAlternateAskSol != null ? (
            <Link
              href={compareHref}
              className="rounded border border-[#641ae6]/35 bg-[#641ae6]/10 px-1 py-px font-mono text-[9px] font-semibold tabular-nums text-[#641ae6] hover:bg-[#641ae6]/20"
              title={`Compare ${alternateAsks.length + 1} venue asks`}
              data-growth-event="trade_listing_compare_chip"
              data-growth-context={`trade_compare:${listing.id}`}
            >
              +{alternateAsks.length} venue{alternateAsks.length > 1 ? "s" : ""} ·{" "}
              {bestAlternateAskSol} ◎
            </Link>
          ) : null}
        </div>

        {nft.listing.price != null ? (
          <div className="grid grid-cols-2 gap-1">
            {showPartnerBuyLink && partnerCheckoutUrl ? (
              <a
                href={partnerCheckoutUrl}
                target="_blank"
                rel="noreferrer"
                className="tensor-btn-primary flex h-6 items-center justify-center text-[9px]"
                data-growth-event="cta_trade_partner_deep_link"
                data-growth-context={`trade_buy_partner:${listing.id}`}
              >
                Buy ↗
              </a>
            ) : (
              <button
                type="button"
                className="tensor-btn-primary h-6 text-[9px] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={buyDisabled}
                title={buyTitle}
                onClick={handleBuy}
              >
                {pending ? "…" : "Buy"}
              </button>
            )}
            <button
              type="button"
              className="tensor-btn-primary h-6 text-[9px] opacity-80"
              onClick={() => setOfferOpen(true)}
            >
              Bid
            </button>
          </div>
        ) : (
          <p className="text-[10px] text-[var(--trade-muted)]">Unlisted</p>
        )}
      </div>

      <BuyNowModal
        open={buyOpen}
        onClose={() => setBuyOpen(false)}
        listing={listing}
        collectionSlug={collectionSlug}
      />
      <PlaceOfferModal
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
        listing={listing}
        collectionSlug={collectionSlug}
      />
    </article>
  );
}

/** Convenience wrapper when you only have TradeListing. */
export function TensorNftCardFromListing({
  listing,
  collectionSlug,
  priority = false,
  rank,
}: {
  listing: TradeListing;
  collectionSlug: string;
  priority?: boolean;
  rank?: number;
}) {
  const nft = mapTradeListingToTensorNft(listing, collectionSlug, rank);
  return (
    <TensorNftCard
      nft={nft}
      listing={listing}
      collectionSlug={collectionSlug}
      priority={priority}
    />
  );
}
