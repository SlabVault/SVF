import {
  SLABVAULT_TRADE_COLLECTIONS,
  type TradeCollectionConfig,
  type TradePartnerId,
} from "@/lib/onchain/collections";
import { TENSOR_FOUNDATION_REPOS } from "@/lib/integrations/tensor";
import {
  getPartnerListingSeedCount,
  getPartnerStatsForPlatform,
  isPartnerIngestSupported,
  type PartnerTradeStatsResult,
} from "@/lib/partner-listings";
import { getTradeCollectionBySlug } from "@/lib/onchain/collections";
import type { TradeListing } from "@/lib/trade-listings";
import {
  computeTradeCollectionStats,
  deriveIngestListedPct,
  mapSlabsToTradeListings,
} from "@/lib/trade-listings";
import { getDatabaseUrl } from "@/lib/db-connection";
import type {
  MarketplaceListResult,
  MarketplaceSlab,
} from "@/lib/marketplace-slabs";

/** Liquidity venues surfaced on the trade landing (Tensor index aggregates ME depth). */
export const TRADE_LIQUIDITY_VENUES = [
  {
    id: "collector_crypt",
    name: "Collector Crypt",
    description: "Graded Pokémon pNFTs — primary CC inventory lane.",
  },
  {
    id: "phygitals",
    name: "Phygitals",
    description: "Compressed NFT slabs — Bubblegum tree depth via Tensor.",
  },
  {
    id: "magic_eden",
    name: "Magic Eden",
    description: "Cross-venue asks where Tensor index covers the collection.",
  },
] as const;

export type TradeLandingCollectionPreview = {
  slug: string;
  name: string;
  partner: TradePartnerId;
  tokenStandard: TradeCollectionConfig["tokenStandard"];
  description: string;
  floorSol: string | null;
  listedCount: number | null;
  /** Tensor buy-now / partner floor when listed > 0. */
  sellNowSol?: string | null;
  volume24hSol?: string | null;
  marketCapSol?: string | null;
  priceChange24hPct?: number | null;
  listedPct?: number | null;
  status: "preview" | "index_pending" | "live";
  href: string;
  /** Optional collection logo for index table / nav thumbs. */
  imageUrl?: string | null;
};

export type TradeLandingStats = {
  venueCount: number;
  collectionCount: number;
  /** Human label for listing data source health. */
  listingDataLabel: string;
  listingDataReady: boolean;
};

/** Live partner floor + count for landing grid (from ingest, not JSON seed alone). */
export type TradeLandingPartnerPreview = {
  slug: string;
  partner: TradePartnerId;
  floorSol: number | null;
  listedCount: number;
  fromFallback: boolean;
  /** Ingest-derived ribbon metrics when Tensor statsV2 is unavailable. */
  volume24hSol?: number | null;
  priceChange24hPct?: number | null;
  listedPct?: number | null;
};

type TradeLandingTreasuryStats = {
  floorSol: number | null;
  listedCount: number;
  volume24hSol?: number | null;
  priceChange24hPct?: number | null;
  listedPct?: number | null;
};

export type TradeLandingPartnerPreviewsContext = {
  previews: TradeLandingPartnerPreview[];
  /** Listing rows merged for landing aggregate stats ribbon. */
  partnerListings: TradeListing[];
};

export type TradeHowItWorksStep = {
  step: string;
  title: string;
  body: string;
};

export const TRADE_HOW_IT_WORKS_STEPS: TradeHowItWorksStep[] = [
  {
    step: "01",
    title: "Browse one desk",
    body: "Filter graded slabs across Collector Crypt, Phygitals, and Magic Eden liquidity — unified search instead of tab-hopping.",
  },
  {
    step: "02",
    title: "Compare depth",
    body: "Merged listings across CC, Phygitals, and treasury on `/trade/all`. Cert-unified compare strip ships in M5 (Soon).",
  },
  {
    step: "03",
    title: "Connect & trade",
    body: "Link your wallet to list, bid, and fill on-chain. Wallet-native settlement ships in the next slice — preview collections today.",
  },
];

const PARTNER_DESCRIPTIONS: Record<TradePartnerId, string> = {
  collector_crypt:
    "PSA-graded Pokémon slabs vaulted on Collector Crypt — TensorSwap pNFT depth.",
  phygitals:
    "Phygitals graded inventory — compressed NFT tree indexed via Tensor TComp.",
  magic_eden:
    "Graded-card liquidity on Magic Eden — aggregated asks via the Tensor index.",
  slabvault_treasury:
    "Community vault slabs listed for on-site SOL checkout and future Tensor depth.",
  beezie: "Beezie graded inventory on Base — compare and deep link until multichain fill ships.",
  courtyard:
    "Courtyard graded inventory on Polygon — cert compare across chains; deep link v1.",
};

/** Featured collections for the landing index (Solana live + multichain preview). */
const LANDING_COLLECTION_SLUGS = [
  "slabvault-treasury",
  "collector-crypt",
  "phygitals",
  "magic-eden",
  "beezie",
  "courtyard",
];

function partnerPreviewForSlug(
  slug: string,
  partnerPreviews?: TradeLandingPartnerPreview[],
): TradeLandingPartnerPreview | undefined {
  return partnerPreviews?.find((row) => row.slug === slug);
}

function mapCollectionPreview(
  config: TradeCollectionConfig,
  treasuryStats?: TradeLandingTreasuryStats,
  options?: {
    treasuryUnavailable?: boolean;
    partnerPreviews?: TradeLandingPartnerPreview[];
  },
): TradeLandingCollectionPreview {
  const isTreasury = config.slug === "slabvault-treasury";
  const partnerPreview = partnerPreviewForSlug(config.slug, options?.partnerPreviews);
  const partnerSeedCount = isPartnerIngestSupported(config.partner)
    ? getPartnerListingSeedCount(config.partner)
    : 0;
  const partnerLive =
    (partnerPreview?.listedCount ?? 0) > 0 || partnerSeedCount > 0;

  if (isTreasury && options?.treasuryUnavailable) {
    return {
      slug: config.slug,
      name: config.name,
      partner: config.partner,
      tokenStandard: config.tokenStandard,
      description: "Community vault listings — temporarily unavailable.",
      floorSol: null,
      listedCount: null,
      status: "preview",
      href: `/trade/c/${config.slug}`,
    };
  }

  const partnerFloor =
    partnerPreview?.floorSol != null ? String(partnerPreview.floorSol) : null;
  const partnerListedCount = partnerPreview?.listedCount ?? null;
  const resolvedListedCount = isTreasury
    ? (treasuryStats?.listedCount ?? 0)
    : partnerListedCount != null
      ? partnerListedCount
      : partnerLive
        ? partnerSeedCount
        : null;
  const hasListings = (resolvedListedCount ?? 0) > 0;
  const ingestRibbon = isTreasury
    ? {
        volume24hSol:
          treasuryStats?.volume24hSol != null
            ? String(treasuryStats.volume24hSol)
            : null,
        priceChange24hPct: treasuryStats?.priceChange24hPct ?? null,
        listedPct: treasuryStats?.listedPct ?? null,
      }
    : {
        volume24hSol:
          partnerPreview?.volume24hSol != null
            ? String(partnerPreview.volume24hSol)
            : null,
        priceChange24hPct: partnerPreview?.priceChange24hPct ?? null,
        listedPct: partnerPreview?.listedPct ?? null,
      };

  return {
    slug: config.slug,
    name: config.name,
    partner: config.partner,
    tokenStandard: config.tokenStandard,
    description: PARTNER_DESCRIPTIONS[config.partner] ?? config.notes,
    floorSol: isTreasury
      ? treasuryStats?.floorSol != null
        ? String(treasuryStats.floorSol)
        : null
      : partnerFloor,
    listedCount: resolvedListedCount,
    sellNowSol: isTreasury
      ? hasListings && treasuryStats?.floorSol != null
        ? String(treasuryStats.floorSol)
        : null
      : hasListings
        ? partnerFloor
        : null,
    ...ingestRibbon,
    status:
      config.status === "preview"
        ? "preview"
        : isTreasury
          ? (treasuryStats?.listedCount ?? 0) > 0
            ? "live"
            : "preview"
          : (partnerListedCount ?? partnerSeedCount) > 0
            ? "live"
            : partnerLive
              ? "live"
              : "preview",
    href: `/trade/c/${config.slug}`,
  };
}

export type TradeLandingTreasuryContext = {
  treasuryStats?: TradeLandingTreasuryStats;
  deskListings: TradeListing[];
  listResult?: MarketplaceListResult;
  /** True when DATABASE_URL is set but treasury DB read failed. */
  treasuryUnavailable: boolean;
};

/** Sync nav fallback — JSON seed counts only; prefer loadTradeLandingNavCollections on SSR desks. */
export function getTradeLandingNavCollections(): TradeLandingCollectionPreview[] {
  return getTradeLandingCollections();
}

export function getTradeLandingCollections(
  treasuryStats?: TradeLandingTreasuryStats,
  options?: {
    treasuryUnavailable?: boolean;
    partnerPreviews?: TradeLandingPartnerPreview[];
  },
): TradeLandingCollectionPreview[] {
  const bySlug = new Map(
    SLABVAULT_TRADE_COLLECTIONS.map((config) => [config.slug, config]),
  );

  return LANDING_COLLECTION_SLUGS.flatMap((slug) => {
    const config = bySlug.get(slug);
    return config ? [mapCollectionPreview(config, treasuryStats, options)] : [];
  });
}

type PartnerPreviewSource = {
  slug: string;
  platform: PartnerTradeStatsResult["platform"];
  stats: PartnerTradeStatsResult["stats"];
  fromFallback: boolean;
};

function mapPartnerStatsToPreview(
  result: PartnerPreviewSource,
): TradeLandingPartnerPreview {
  const supplyCount = getPartnerListingSeedCount(result.platform);
  return {
    slug: result.slug,
    partner: result.platform,
    floorSol: result.stats.floorSol,
    listedCount: result.stats.listedCount,
    fromFallback: result.fromFallback,
    volume24hSol: result.stats.volume24hSol ?? null,
    priceChange24hPct: result.stats.priceChange24hPct ?? null,
    listedPct: deriveIngestListedPct(
      result.stats.listedCount,
      supplyCount > 0 ? supplyCount : null,
    ),
  };
}

/** Parallel partner ingest stats for CC + Phygitals landing previews. */
export async function loadTradeLandingPartnerPreviews(): Promise<TradeLandingPartnerPreviewsContext> {
  const { listPartnerTradeListings } = await import("@/lib/partner-listings");

  const ccCollection = getTradeCollectionBySlug("collector-crypt");
  const phyCollection = getTradeCollectionBySlug("phygitals");

  const [ccResult, phyResult] = await Promise.all([
    ccCollection
      ? listPartnerTradeListings(ccCollection)
      : Promise.resolve(null),
    phyCollection
      ? listPartnerTradeListings(phyCollection)
      : Promise.resolve(null),
  ]);

  const previews: TradeLandingPartnerPreview[] = [];
  if (ccResult) previews.push(mapPartnerStatsToPreview(ccResult));
  if (phyResult) previews.push(mapPartnerStatsToPreview(phyResult));

  const partnerListings = [
    ...(ccResult?.listings ?? []),
    ...(phyResult?.listings ?? []),
  ];

  return { previews, partnerListings };
}

/** Partner + treasury previews for collection nav badges (matches footer aggregate). */
export async function loadTradeLandingNavCollections(): Promise<
  TradeLandingCollectionPreview[]
> {
  const [treasuryContext, partnerContext] = await Promise.all([
    loadOptionalTradeLandingTreasuryContext(),
    loadTradeLandingPartnerPreviews(),
  ]);

  return getTradeLandingCollections(treasuryContext.treasuryStats, {
    treasuryUnavailable: treasuryContext.treasuryUnavailable,
    partnerPreviews: partnerContext.previews,
  });
}

/**
 * Optional treasury slab load for `/trade` landing.
 * Partner previews load separately via loadTradeLandingPartnerPreviews().
 *
 * Local dev without Postgres: omit DATABASE_URL or run `npx prisma dev`
 * (`prisma+postgres://` needs the Prisma dev server). DB failures never
 * block the landing page — treasury renders as 0 listings / null floor stub.
 */
export async function loadOptionalTradeLandingTreasuryContext(): Promise<TradeLandingTreasuryContext> {
  const { listMarketplaceSlabs } = await import("@/lib/marketplace-slabs");

  let listResult: MarketplaceListResult;
  try {
    listResult = await listMarketplaceSlabs({ status: "AVAILABLE" });
  } catch {
    listResult = {
      slabs: [],
      fromFallback: true,
      dbStatus: "unreachable",
    };
  }

  const treasuryStats = getTradeLandingTreasuryStats(listResult.slabs);
  return {
    treasuryStats,
    deskListings: getTradeLandingDeskListings(listResult.slabs),
    listResult,
    treasuryUnavailable: false,
  };
}

export function getTradeLandingStats(options?: {
  partnerPreviews?: TradeLandingPartnerPreview[];
  treasuryListedCount?: number;
}): TradeLandingStats {
  const ccSeed = getPartnerListingSeedCount("collector_crypt");
  const phySeed = getPartnerListingSeedCount("phygitals");
  const partnerListedFromPreviews =
    options?.partnerPreviews?.reduce((sum, row) => sum + row.listedCount, 0) ??
    0;
  const treasuryListed = options?.treasuryListedCount ?? 0;
  const partnerReady =
    partnerListedFromPreviews + ccSeed + phySeed + treasuryListed > 0;

  let listingDataLabel = "Run npm run sync:discover";
  if (partnerListedFromPreviews > 0 || ccSeed + phySeed > 0) {
    listingDataLabel = "Partner ingest active";
  } else if (treasuryListed > 0) {
    listingDataLabel = "Treasury listings live";
  }

  return {
    venueCount: TRADE_LIQUIDITY_VENUES.length,
    collectionCount: SLABVAULT_TRADE_COLLECTIONS.length,
    listingDataLabel,
    listingDataReady: partnerReady,
  };
}

/** Live vault treasury listings for the landing desk (Slab / MarketplaceSlab data). */
export function getTradeLandingDeskListings(
  slabs: MarketplaceSlab[],
): TradeListing[] {
  return mapSlabsToTradeListings(slabs, "slabvault-treasury");
}

export function getTradeLandingTreasuryStats(slabs: MarketplaceSlab[]) {
  const listings = mapSlabsToTradeListings(slabs, "slabvault-treasury");
  const stats = computeTradeCollectionStats(listings);
  return {
    floorSol: stats.floorSol,
    listedCount: stats.listedCount,
    volume24hSol: stats.volume24hSol ?? null,
    priceChange24hPct: stats.priceChange24hPct ?? null,
    listedPct: deriveIngestListedPct(stats.listedCount, stats.listedCount),
  };
}

export { getTradeLandingAggregateFromCollections } from "@/lib/trade-landing-aggregate";

/** Merge Tensor statsV2 into landing previews when API key + slug are configured. */
export async function enrichTradeLandingCollectionsWithTensor(
  collections: TradeLandingCollectionPreview[],
): Promise<TradeLandingCollectionPreview[]> {
  const { fetchTensorRibbonMetricsByCollectionSlug } = await import(
    "@/lib/trade/tensor-ribbon-metrics"
  );
  const metricsBySlug = await fetchTensorRibbonMetricsByCollectionSlug(
    collections.map((c) => c.slug),
  );

  return collections.map((row) => {
    const tensor = metricsBySlug.get(row.slug);
    if (!tensor) return row;

    const hasListings = (row.listedCount ?? 0) > 0;

    return {
      ...row,
      sellNowSol:
        hasListings && tensor.sellNowSol != null
          ? String(tensor.sellNowSol)
          : row.sellNowSol ?? (hasListings ? row.floorSol : null),
      volume24hSol:
        tensor.volume24hSol != null ? String(tensor.volume24hSol) : row.volume24hSol,
      marketCapSol:
        tensor.marketCapSol != null ? String(tensor.marketCapSol) : row.marketCapSol,
      priceChange24hPct: tensor.priceChange24hPct ?? row.priceChange24hPct,
      listedPct: tensor.listedPct ?? row.listedPct,
    };
  });
}

export { TENSOR_FOUNDATION_REPOS };
