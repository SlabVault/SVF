import { extractCertNumber } from "@/lib/trade/extract-cert-number";
import {
  resolveTradeListingMint,
  type TradeCollectionStats,
  type TradeListing,
} from "@/lib/trade-listings";

import type { TensorCollectionStats, TensorNft } from "./types";

const LAMPORTS_PER_SOL = 1_000_000_000;

/** Seller wallet or TCM list state — required for on-chain grid/item fill. */
export function tradeListingHasOnChainBuyMetadata(listing: TradeListing): boolean {
  return Boolean(listing.sellerWallet?.trim()) || Boolean(listing.listState?.trim());
}

/** Human-readable reason on-chain buy is blocked (null when metadata is present). */
export function resolveOnChainBuyBlockReason(
  listing: TradeListing,
  onChainSettlement: boolean,
): string | null {
  if (!onChainSettlement) return null;
  if (!tradeListingHasOnChainBuyMetadata(listing)) {
    return "Listing missing seller wallet or list state for on-chain buy.";
  }
  return null;
}

export function mapTradeListingToTensorNft(
  listing: TradeListing,
  collectionSlug: string,
  rank?: number,
): TensorNft {
  const cert = extractCertNumber(listing);
  const certOrMint = cert ?? listing.id;
  const lamports =
    listing.askSol > 0
      ? Math.round(listing.askSol * LAMPORTS_PER_SOL).toString()
      : null;

  const mint = resolveTradeListingMint(listing) ?? listing.id;

  return {
    mint,
    slug: collectionSlug,
    name: listing.name,
    imageUri: listing.imageUrl,
    owner: listing.sellerWallet ?? "",
    askSol: listing.askSol,
    partnerUrl: listing.vaultedUrl,
    certOrMint,
    grade: listing.grade,
    rank,
    listing: {
      price: lamports,
      txId: "",
      seller: listing.sellerWallet ?? "",
      listState: listing.listState ?? "",
      source: collectionSlug,
      blockNumber: "",
      priceUnit: "SOL",
    },
  };
}

export function mapTradeListingsToTensorNfts(
  listings: TradeListing[],
  collectionSlug: string,
): TensorNft[] {
  return listings.map((listing, index) =>
    mapTradeListingToTensorNft(listing, collectionSlug, index + 1),
  );
}

/** Map desk stats to template stats-grid fields. */
export function mapTradeStatsToTensorStats(
  stats: TradeCollectionStats,
  supplyCount?: number | null,
): Pick<
  TensorCollectionStats,
  "numMints" | "numListed" | "salesAll" | "marketCap"
> & { floorSol: number | null } {
  const numMints = supplyCount ?? stats.listedCount;
  return {
    numMints,
    numListed: stats.listedCount,
    salesAll: 0,
    marketCap: stats.floorSol != null ? String(stats.floorSol * LAMPORTS_PER_SOL) : "0",
    floorSol: stats.floorSol,
  };
}
