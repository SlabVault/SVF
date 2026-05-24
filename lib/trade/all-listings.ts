import {
  SLABVAULT_TRADE_COLLECTIONS,
  type TradeCollectionConfig,
  type TradePartnerId,
} from "@/lib/onchain/collections";
import {
  dedupePartnerTradeListings,
  isPartnerIngestSupported,
  listPartnerTradeListings,
} from "@/lib/partner-listings";
import {
  computeTradeCollectionStats,
  mapSlabsToTradeListings,
  sortTradeListings,
  type TradeCollectionStats,
  type TradeListing,
} from "@/lib/trade-listings";
import { isTensorReadConfigured } from "@/lib/integrations/tensor";
import { loadOptionalTradeLandingTreasuryContext } from "@/lib/trade-landing";
import {
  countAllListingsVenues,
  countListingsByVenue,
  resolveListingPartner,
} from "@/lib/trade/listing-venue-utils";
import { getTradeCollectionDepth } from "@/lib/trade/tensor-collection-depth";
import { ALL_LISTINGS_SLUG } from "@/lib/trade-routes";

export { ALL_LISTINGS_SLUG };

/** Synthetic collection config for `/trade/all` desk shell. */
export const ALL_LISTINGS_COLLECTION: TradeCollectionConfig = {
  slug: ALL_LISTINGS_SLUG,
  partner: "slabvault_treasury",
  name: "All Listings",
  chain: "solana",
  status: "live",
  settlementMode: "on_chain_tensor",
  collectionMint: null,
  tokenStandard: "unknown",
  tensorSdk: null,
  whitelistOnTensor: false,
  notes:
    "Aggregate desk — merged CC, Phygitals, SlabVault treasury, Magic Eden, Beezie, and Courtyard rows.",
};

export const AGGREGATE_COLLECTION_SLUGS = [
  "collector-crypt",
  "phygitals",
  "magic-eden",
  "slabvault-treasury",
  "beezie",
  "courtyard",
] as const;

type AllListingsLoadDeps = {
  listPartnerTradeListings: typeof listPartnerTradeListings;
  loadOptionalTradeLandingTreasuryContext: typeof loadOptionalTradeLandingTreasuryContext;
  getTradeCollectionDepth: typeof getTradeCollectionDepth;
};

const defaultLoadDeps: AllListingsLoadDeps = {
  listPartnerTradeListings,
  loadOptionalTradeLandingTreasuryContext,
  getTradeCollectionDepth,
};

let loadDeps: AllListingsLoadDeps = defaultLoadDeps;

/** Inject stub loaders for `loadAllTradeListings` integration tests. */
export function __setAllListingsLoadDepsForTests(
  overrides: Partial<AllListingsLoadDeps> | null,
): void {
  loadDeps = overrides ? { ...defaultLoadDeps, ...overrides } : defaultLoadDeps;
}

export type AllListingsAggregateStats = {
  listedCount: number;
  floorSol: number | null;
  buyNowSol: number | null;
  sellNowSol: number | null;
  volume24hSol: number | null;
  venueCount: number;
};

export type AllListingsLoadResult = {
  listings: TradeListing[];
  stats: TradeCollectionStats;
  /** Deduped nav/footer stats — listedCount/floor match merged desk, not preview sum. */
  aggregate: AllListingsAggregateStats;
  venueCount: number;
  venues: TradePartnerId[];
  fromFallback: boolean;
};

export {
  countAllListingsVenues,
  countListingsByVenue,
  resolveListingPartner,
} from "@/lib/trade/listing-venue-utils";

/** Deduped aggregate stats for nav/footer — matches merged `/trade/all` desk counts. */
export function buildAllListingsAggregateStats(
  listings: TradeListing[],
): AllListingsAggregateStats {
  const stats = computeTradeCollectionStats(listings);
  const { venueCount } = countAllListingsVenues(listings);
  const floorSol = stats.floorSol;

  return {
    listedCount: stats.listedCount,
    floorSol,
    buyNowSol: floorSol,
    sellNowSol: floorSol,
    volume24hSol: stats.volume24hSol ?? null,
    venueCount,
  };
}

/** Flatten venue batches, dedupe by mint/cert alias, keep lowest ask, sort price asc. */
export function mergeAllTradeListings(
  batches: TradeListing[][],
): TradeListing[] {
  const merged = dedupePartnerTradeListings(
    batches.flat().filter((listing) => listing.askSol > 0),
  );
  return sortTradeListings(merged, "price_asc");
}

async function loadCollectionListings(
  collection: TradeCollectionConfig,
): Promise<{ listings: TradeListing[]; fromFallback: boolean }> {
  if (isPartnerIngestSupported(collection.partner)) {
    const partner = await loadDeps.listPartnerTradeListings(collection);
    return {
      listings: partner.listings,
      fromFallback: partner.fromFallback,
    };
  }

  if (collection.partner === "magic_eden") {
    if (!isTensorReadConfigured()) {
      return { listings: [], fromFallback: false };
    }
    const depth = await loadDeps.getTradeCollectionDepth(collection);
    return {
      listings: depth.listings,
      fromFallback: depth.fromFallback ?? false,
    };
  }

  if (collection.status === "preview") {
    return { listings: [], fromFallback: false };
  }

  if (collection.slug === "slabvault-treasury") {
    const treasury = await loadDeps.loadOptionalTradeLandingTreasuryContext();
    return {
      listings: mapSlabsToTradeListings(
        treasury.listResult?.slabs ?? [],
        collection.slug,
      ),
      fromFallback: treasury.listResult?.fromFallback ?? false,
    };
  }

  return { listings: [], fromFallback: false };
}

/** Parallel load + merge listings from every active registry collection. */
export async function loadAllTradeListings(): Promise<AllListingsLoadResult> {
  const bySlug = new Map(
    SLABVAULT_TRADE_COLLECTIONS.map((config) => [config.slug, config]),
  );

  const loads = await Promise.all(
    AGGREGATE_COLLECTION_SLUGS.flatMap((slug) => {
      const collection = bySlug.get(slug);
      return collection ? [loadCollectionListings(collection)] : [];
    }),
  );

  const listings = mergeAllTradeListings(loads.map((row) => row.listings));
  const stats = computeTradeCollectionStats(listings);
  const aggregate = buildAllListingsAggregateStats(listings);
  const { venueCount, venues } = countAllListingsVenues(listings);
  const fromFallback = loads.some((row) => row.fromFallback);

  return { listings, stats, aggregate, venueCount, venues, fromFallback };
}
