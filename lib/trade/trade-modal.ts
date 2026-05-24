import { parseEnvFlag } from "@/lib/env-flags";
import { getTradeCollectionBySlug } from "@/lib/onchain/collections";
import { resolvePartnerDeepLink, slugToPartnerPlatform } from "@/lib/trade/partner-deep-link";
import { PARTNER_SOL_USD_ESTIMATE } from "@/lib/trade/partner-constants";
import type { TradeListing } from "@/lib/trade-listings";
import type { ExternalListingSource } from "@/types/external-listing";

/** Display-only enforced royalty until listing metadata exposes on-chain rate. */
export const DEFAULT_TRADE_ROYALTY_PCT = 5;

export type TradeModalListing = {
  listing: TradeListing;
  collectionSlug: string;
};

export type TradeVenueKind = ExternalListingSource | "slabvault" | "tensor";

const COLLECTION_PARTNER: Record<string, ExternalListingSource | "slabvault"> = {
  "collector-crypt": "collector_crypt",
  phygitals: "phygitals",
  "magic-eden": "magic_eden",
  "slabvault-treasury": "slabvault",
};

const COLLECTION_VENUE: Record<string, TradeVenueKind> = {
  "collector-crypt": "collector_crypt",
  phygitals: "phygitals",
  "magic-eden": "tensor",
  "slabvault-treasury": "slabvault",
};

/** Maps desk collection slug to settlement venue label for modals. */
export function resolveTradeVenueKind(collectionSlug: string): TradeVenueKind {
  return COLLECTION_VENUE[collectionSlug] ?? "tensor";
}

export function resolveTradePartnerBadge(
  collectionSlug: string,
): { kind: "external" | "slabvault"; source?: ExternalListingSource } {
  const mapped = COLLECTION_PARTNER[collectionSlug];
  if (mapped === "slabvault") return { kind: "slabvault" };
  if (mapped) return { kind: "external", source: mapped };
  return { kind: "slabvault" };
}

export function tradeListingUsesPartnerSiteSettlement(
  listing: TradeListing,
  collectionSlug: string,
): boolean {
  const mode =
    listing.settlementMode ??
    getTradeCollectionBySlug(collectionSlug)?.settlementMode;
  return mode === "partner_site";
}

/** Partner checkout URL for grid/item deep-link buy (vaultedUrl or resolved partner link). */
export function resolveTradeListingPartnerCheckoutUrl(
  listing: TradeListing,
  collectionSlug: string,
): string | null {
  if (tradeListingUsesPartnerSiteSettlement(listing, collectionSlug)) {
    const partner = resolveTradePartnerBadge(collectionSlug);
    const platform = slugToPartnerPlatform(collectionSlug);
    if (partner.kind === "external" && platform) {
      return resolvePartnerDeepLink(listing, platform);
    }
    return listing.vaultedUrl?.trim() ?? null;
  }

  return listing.vaultedUrl?.trim() ?? null;
}

/** Grid CTA: partner_site settlement or on-chain row missing seller meta with outbound URL. */
export function tradeListingShowsPartnerBuyLink(
  listing: TradeListing,
  collectionSlug: string,
): boolean {
  if (listing.askSol <= 0) return false;

  if (tradeListingUsesPartnerSiteSettlement(listing, collectionSlug)) {
    return Boolean(resolveTradeListingPartnerCheckoutUrl(listing, collectionSlug));
  }

  const hasSellerMeta =
    Boolean(listing.sellerWallet?.trim()) || Boolean(listing.listState?.trim());
  if (hasSellerMeta) return false;
  return Boolean(listing.vaultedUrl?.trim());
}

export function formatTradeRoyaltySol(askSol: number, royaltyPct = DEFAULT_TRADE_ROYALTY_PCT): number {
  const rate = royaltyPct / 100;
  return Number((askSol * rate).toFixed(4));
}

export function formatTradeTotalSol(askSol: number, royaltyPct = DEFAULT_TRADE_ROYALTY_PCT): number {
  return Number((askSol + formatTradeRoyaltySol(askSol, royaltyPct)).toFixed(4));
}

/** FMV when present; otherwise ask × partner SOL/USD estimate for modal copy. */
export function estimateTradeListingUsd(listing: TradeListing): number | null {
  if (listing.estimatedValueUsd != null && listing.estimatedValueUsd > 0) {
    return listing.estimatedValueUsd;
  }
  return formatListedAskUsd(listing.askSol);
}

/** Listed ask USD — live SOL spot when available, else partner estimate. */
export function formatListedAskUsd(
  askSol: number,
  solPriceUsd?: number | null,
): number | null {
  if (askSol <= 0) return null;
  const rate =
    solPriceUsd != null && Number.isFinite(solPriceUsd) && solPriceUsd > 0
      ? solPriceUsd
      : PARTNER_SOL_USD_ESTIMATE;
  return Math.round(askSol * rate * 100) / 100;
}

/** Client-safe gate — prefers public flag; server-only flag is false in the browser bundle. */
export function isTradeWriteEnabledClient(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_TENSOR_TRADE_WRITE_ENABLED ??
      process.env.TENSOR_TRADE_WRITE_ENABLED,
    false,
  );
}

/** Client-safe mirror for TRADE_TX_REQUIRE_WALLET_CHALLENGE (staging/production hardening). */
export function isTradeTxWalletChallengeRequiredClient(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_TRADE_TX_REQUIRE_WALLET_CHALLENGE ??
      process.env.TRADE_TX_REQUIRE_WALLET_CHALLENGE,
    false,
  );
}

/** Native tooltip copy when write actions are disabled in the trade panel. */
export function tradeWriteDisabledTooltip(): string {
  return "On-chain buy disabled until staging ops enable writes and Tensor seller enrichment is present on the listing.";
}
