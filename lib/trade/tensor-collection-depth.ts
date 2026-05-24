import {
  fetchCollectionStats,
  listListings,
  resolveTensorSlugForCollection,
} from "@/lib/onchain/clients/tensor-tcm";
import type { TensorMintListing } from "@/lib/onchain/tensor-api";
import {
  isHeliusDasConfigured,
  isTensorReadConfigured,
} from "@/lib/integrations/tensor";
import type { TradeCollectionConfig } from "@/lib/onchain/collections";
import { getTradeCollectionBySlug } from "@/lib/onchain/collections";
import type { MarketplaceSlab } from "@/lib/marketplace-slabs";
import {
  isPartnerIngestSupported,
  listPartnerTradeListings,
} from "@/lib/partner-listings";
import {
  computeTradeCollectionStats,
  type TradeCollectionStats,
  type TradeListing,
} from "@/lib/trade-listings";

export type TradeCollectionDepthSource =
  | "partner_ingest"
  | "tensor_api"
  | "helius_das"
  | "unconfigured";

export type TradeCollectionDepth = {
  source: TradeCollectionDepthSource;
  tensorSlug: string | null;
  stats: TradeCollectionStats;
  listings: TradeListing[];
  readConfigured: boolean;
  fromFallback?: boolean;
  dbStatus?: "unconfigured" | "connected" | "unreachable";
  error?: string;
};

function traitValue(
  attributes: TensorMintListing["attributes"],
  keys: string[],
): string | null {
  for (const key of keys) {
    const hit = attributes.find(
      (a) => a.trait_type.toLowerCase() === key.toLowerCase(),
    );
    if (hit?.value) return hit.value;
  }
  return null;
}

function mapTensorListingToTradeListing(
  listing: TensorMintListing,
  collectionId: string,
): TradeListing {
  const grade =
    traitValue(listing.attributes, ["grade", "grader", "psa grade", "bgs grade"]) ??
    "Graded";
  const cert =
    traitValue(listing.attributes, ["cert", "cert number", "cert #", "certification"]) ??
    null;
  const askSol = listing.priceSol ?? 0;
  const name = cert ? `${listing.name} #${cert}` : listing.name;

  const slab: MarketplaceSlab = {
    id: listing.mint,
    name,
    grade,
    estimatedValueUsd: askSol > 0 ? Math.round(askSol * 150) : null,
    acquiredAt: new Date().toISOString(),
    imageUrl:
      listing.imageUri ??
      (collectionId === "collector-crypt"
        ? "/gacha/collector-crypt.svg"
        : "/gacha/phygitals.svg"),
    vaultedUrl: `https://solscan.io/token/${listing.mint}`,
    collectrUrl: null,
    status: "AVAILABLE",
    solPrice: askSol,
    svfPrice: 0,
    fallbackSource: undefined,
  };

  return {
    ...slab,
    askSol,
    collectionId,
    sellerWallet: listing.sellerWallet ?? undefined,
    listState: listing.listState ?? undefined,
    settlementMode: getTradeCollectionBySlug(collectionId)?.settlementMode,
  };
}

function isDepthReadConfigured(collection: TradeCollectionConfig): boolean {
  return (
    isPartnerIngestSupported(collection.partner) ||
    isTensorReadConfigured() ||
    isHeliusDasConfigured()
  );
}

/** Server-only depth read for `/trade/c/[slug]` partner collections. */
export async function getTradeCollectionDepth(
  collection: TradeCollectionConfig,
): Promise<TradeCollectionDepth> {
  const tensorSlug = resolveTensorSlugForCollection(collection.slug);
  const readConfigured = isDepthReadConfigured(collection);

  if (isPartnerIngestSupported(collection.partner)) {
    const partner = await listPartnerTradeListings(collection);
    if (partner.listings.length > 0) {
      return {
        source: "partner_ingest",
        tensorSlug,
        stats: computeTradeCollectionStats(partner.listings),
        listings: partner.listings,
        readConfigured: true,
        fromFallback: partner.fromFallback,
        dbStatus: partner.dbStatus,
      };
    }
  }

  if (!isTensorReadConfigured() && !isHeliusDasConfigured()) {
    return {
      source: "unconfigured",
      tensorSlug,
      stats: { listedCount: 0, floorSol: null, topAskSol: null, totalFmvUsd: null },
      listings: [],
      readConfigured,
    };
  }

  const [statsResult, listingsResult] = await Promise.all([
    fetchCollectionStats(collection.slug, {
      collectionMint: collection.collectionMint,
    }),
    listListings(collection.slug, {
      limit: 48,
      collectionMint: collection.collectionMint,
    }),
  ]);

  const listings = listingsResult.page.listings.map((row) =>
    mapTensorListingToTradeListing(row, collection.slug),
  );

  const statsFromApi = statsResult.stats;
  const stats: TradeCollectionStats = statsFromApi
    ? {
        listedCount: statsFromApi.numListed,
        floorSol: statsFromApi.floorPriceSol,
        topAskSol: listings.reduce<number | null>((max, row) => {
          const ask = row.askSol;
          if (ask <= 0) return max;
          return max == null ? ask : Math.max(max, ask);
        }, null),
        totalFmvUsd: null,
      }
    : computeTradeCollectionStats(listings);

  const source: TradeCollectionDepthSource =
    statsResult.source === "unconfigured"
      ? listingsResult.source
      : statsResult.source;

  return {
    source,
    tensorSlug,
    stats,
    listings,
    readConfigured,
    error: statsResult.error ?? listingsResult.error,
  };
}
