import {
  getTradeCollectionBySlug,
  type TradeChainId,
  type TradePartnerId,
  type TradeSettlementMode,
} from "@/lib/onchain/collections";
import type { MarketplaceSlab } from "@/lib/marketplace-slabs";

export type TradeCollection = {
  id: string;
  name: string;
  slug: string;
  description: string;
};

export const SLABVAULT_TREASURY_COLLECTION: TradeCollection = {
  id: "slabvault-treasury",
  name: "SlabVault Treasury",
  slug: "slabvault-treasury",
  description:
    "Graded slabs from the public vault — live ask preview from vault inventory.",
};

/** Base58 mint — excludes UUID-style partner externalIds. */
export function looksLikeSolanaMint(value: string | null | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length < 32 || trimmed.length > 44) return false;
  if (trimmed.includes("-")) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(trimmed);
}

function mintFromVaultedUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/solscan\.io\/token\/([1-9A-HJ-NP-Za-km-z]{32,44})/i);
  const candidate = match?.[1]?.trim();
  return candidate && looksLikeSolanaMint(candidate) ? candidate : null;
}

/** On-chain NFT mint for Tensor tx routes — not desk id / cert keys. */
export function resolveTradeListingMint(listing: TradeListing): string | null {
  if (looksLikeSolanaMint(listing.id)) return listing.id.trim();
  return mintFromVaultedUrl(listing.vaultedUrl);
}

export type TradeListing = MarketplaceSlab & {
  askSol: number;
  collectionId: string;
  /** Partner venue for aggregation and settlement routing. */
  partner?: TradePartnerId;
  chain?: TradeChainId;
  settlementMode?: TradeSettlementMode;
  /** Tensor ask seller — required for on-chain fill unless listState is set. */
  sellerWallet?: string;
  /** TCM list state PDA from Tensor index (optional fill path). */
  listState?: string;
  /** TCG set name when partner ingest provides it. */
  setName?: string | null;
  /** Tensor rarity rank when enriched (lower = rarer). */
  rarityRank?: number | null;
  /** Last on-chain sale in SOL when known. */
  lastSaleSol?: number | null;
  /** Other venue asks for the same cert/mint after cross-venue dedupe. */
  alternateVenueAsks?: {
    partner: TradePartnerId;
    askSol: number;
    collectionId: string;
  }[];
};

export type TradeActivityType = "list" | "sale" | "bid" | "cancel";

export type TradeActivityEvent = {
  id: string;
  type: TradeActivityType;
  slabId: string;
  slabName: string;
  amountSol: number | null;
  timestamp: string;
  label: string;
};

export type TradeCollectionStats = {
  listedCount: number;
  floorSol: number | null;
  topAskSol: number | null;
  totalFmvUsd: number | null;
  /** Ingest-derived ribbon metrics when Tensor statsV2 is unavailable. */
  volume24hSol?: number | null;
  volumeAllSol?: number | null;
  sales24h?: number | null;
  priceChange24hPct?: number | null;
};

export const TRADE_KNOWN_GRADERS = ["PSA", "BGS", "CGC"] as const;

export type TradeTraitFilters = {
  grades: string[];
  graders: string[];
  /** Aggregate desk venue filter (URL param `venue`). */
  partners: TradePartnerId[];
  minAskSol: number | null;
  maxAskSol: number | null;
  searchQuery: string;
  /** Matches listing setName or title substring (URL param `set`). */
  setQuery: string;
};

export const DEFAULT_TRADE_FILTERS: TradeTraitFilters = {
  grades: [],
  graders: [],
  partners: [],
  minAskSol: null,
  maxAskSol: null,
  searchQuery: "",
  setQuery: "",
};

/** Partner venue for aggregate desk filtering — listing field wins, else collection registry. */
export function resolveTradeListingPartner(
  listing: Pick<TradeListing, "partner" | "collectionId">,
): TradePartnerId | null {
  if (listing.partner) return listing.partner;
  return getTradeCollectionBySlug(listing.collectionId)?.partner ?? null;
}

export function extractListingGrader(grade: string): string | null {
  const token = grade.trim().split(/\s+/)[0]?.toUpperCase();
  if (!token) return null;
  return TRADE_KNOWN_GRADERS.includes(token as (typeof TRADE_KNOWN_GRADERS)[number])
    ? token
    : null;
}

/** @deprecated Prefer `resolveTradeListingMint` — kept for tests and modals. */
export const tradeListingOnChainMint = resolveTradeListingMint;

export function mapSlabsToTradeListings(
  slabs: MarketplaceSlab[],
  collectionId = SLABVAULT_TREASURY_COLLECTION.id,
): TradeListing[] {
  return slabs.map((slab) => ({
    ...slab,
    askSol: slab.solPrice,
    collectionId,
    partner: "slabvault_treasury",
  }));
}

const MS_24H = 24 * 60 * 60 * 1000;

function roundSolAmount(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function roundPct(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Listed % from ingest supply proxy (e.g. JSON seed count) when Tensor supply is absent. */
export function deriveIngestListedPct(
  listedCount: number,
  supplyCount: number | null | undefined,
): number | null {
  if (listedCount <= 0) return null;
  if (supplyCount != null && supplyCount > 0) {
    return Math.round((listedCount / supplyCount) * 100);
  }
  return null;
}

/** Listing-derived ribbon metrics — honest proxies when Tensor statsV2 is absent. */
export function deriveListingRibbonStats(
  listings: TradeListing[],
  floorSol: number | null,
): Pick<
  TradeCollectionStats,
  "volume24hSol" | "volumeAllSol" | "sales24h" | "priceChange24hPct"
> {
  if (listings.length === 0) {
    return {
      volume24hSol: null,
      volumeAllSol: null,
      sales24h: null,
      priceChange24hPct: null,
    };
  }

  const cutoff = Date.now() - MS_24H;
  const volumeAllSol = roundSolAmount(
    listings.reduce((sum, listing) => sum + listing.askSol, 0),
  );

  let newListingVol = 0;
  for (const listing of listings) {
    if (acquiredAtMs(listing.acquiredAt) >= cutoff) {
      newListingVol += listing.askSol;
    }
  }
  const volume24hSol =
    newListingVol > 0 ? roundSolAmount(newListingVol) : null;

  let priceChange24hPct: number | null = null;
  if (floorSol != null && floorSol > 0) {
    const olderListings = listings.filter(
      (listing) => acquiredAtMs(listing.acquiredAt) <= cutoff,
    );
    if (olderListings.length > 0) {
      const historicalFloor = Math.min(...olderListings.map((listing) => listing.askSol));
      if (historicalFloor > 0) {
        priceChange24hPct = roundPct(
          ((floorSol - historicalFloor) / historicalFloor) * 100,
        );
      }
    }
  }

  return {
    volume24hSol,
    volumeAllSol,
    sales24h: null,
    priceChange24hPct,
  };
}

/** Backfill ribbon metrics from listings when stats omit ingest-derived fields. */
export function ensureCollectionStatsRibbonFromListings(
  stats: TradeCollectionStats,
  listings: TradeListing[],
): TradeCollectionStats {
  if (listings.length === 0) return stats;

  const derived = deriveListingRibbonStats(listings, stats.floorSol);
  return {
    ...stats,
    volume24hSol: stats.volume24hSol ?? derived.volume24hSol,
    volumeAllSol: stats.volumeAllSol ?? derived.volumeAllSol,
    sales24h: stats.sales24h ?? derived.sales24h,
    priceChange24hPct: stats.priceChange24hPct ?? derived.priceChange24hPct,
  };
}

/** Sale events from activity feed override listing proxies for vol/sales cells. */
export function deriveActivityRibbonStats(
  events: TradeActivityEvent[],
): Pick<
  TradeCollectionStats,
  "volume24hSol" | "volumeAllSol" | "sales24h"
> {
  const cutoff = Date.now() - MS_24H;
  let volume24hSol = 0;
  let volumeAllSol = 0;
  let sales24h = 0;
  let hasSale = false;
  let has24hSale = false;

  for (const event of events) {
    if (event.type !== "sale" || event.amountSol == null || event.amountSol <= 0) {
      continue;
    }
    hasSale = true;
    volumeAllSol += event.amountSol;
    const ts = Date.parse(event.timestamp);
    if (Number.isFinite(ts) && ts >= cutoff) {
      has24hSale = true;
      sales24h += 1;
      volume24hSol += event.amountSol;
    }
  }

  return {
    volume24hSol: has24hSale ? roundSolAmount(volume24hSol) : null,
    volumeAllSol: hasSale ? roundSolAmount(volumeAllSol) : null,
    sales24h: has24hSale ? sales24h : null,
  };
}

export function enrichTradeCollectionStatsWithActivity(
  stats: TradeCollectionStats,
  events: TradeActivityEvent[],
): TradeCollectionStats {
  const fromActivity = deriveActivityRibbonStats(events);
  return {
    ...stats,
    volume24hSol: fromActivity.volume24hSol ?? stats.volume24hSol,
    volumeAllSol: fromActivity.volumeAllSol ?? stats.volumeAllSol,
    sales24h: fromActivity.sales24h ?? stats.sales24h,
  };
}

export function computeTradeCollectionStats(
  listings: TradeListing[],
): TradeCollectionStats {
  if (listings.length === 0) {
    return {
      listedCount: 0,
      floorSol: null,
      topAskSol: null,
      totalFmvUsd: null,
      volume24hSol: null,
      volumeAllSol: null,
      sales24h: null,
      priceChange24hPct: null,
    };
  }

  const asks = listings.map((listing) => listing.askSol);
  const fmvValues = listings
    .map((listing) => listing.estimatedValueUsd)
    .filter((value): value is number => value != null);
  const floorSol = Math.min(...asks);

  return {
    listedCount: listings.length,
    floorSol,
    topAskSol: Math.max(...asks),
    totalFmvUsd:
      fmvValues.length > 0
        ? fmvValues.reduce((sum, value) => sum + value, 0)
        : null,
    ...deriveListingRibbonStats(listings, floorSol),
  };
}

function acquiredAtIso(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

/** Synthetic activity rows derived from live listings (read-only MVP). */
export function buildStubTradeActivityFeed(
  listings: TradeListing[],
  limit = 12,
): TradeActivityEvent[] {
  return [...listings]
    .sort(
      (a, b) =>
        new Date(acquiredAtIso(b.acquiredAt)).getTime() -
        new Date(acquiredAtIso(a.acquiredAt)).getTime(),
    )
    .slice(0, limit)
    .map((listing) => ({
      id: `list-${listing.id}`,
      type: "list" as const,
      slabId: listing.id,
      slabName: listing.name,
      amountSol: listing.askSol,
      timestamp: acquiredAtIso(listing.acquiredAt),
      label: "Listed",
    }));
}

export function extractUniqueGrades(listings: TradeListing[]): string[] {
  const grades = new Set(listings.map((listing) => listing.grade.trim()).filter(Boolean));
  return [...grades].sort((a, b) => a.localeCompare(b));
}

export function extractUniqueSetNames(listings: TradeListing[]): string[] {
  const sets = new Set(
    listings
      .map((listing) => listing.setName?.trim())
      .filter((value): value is string => Boolean(value)),
  );
  return [...sets].sort((a, b) => a.localeCompare(b));
}

export type TradeListingSort =
  | "price_asc"
  | "price_desc"
  | "recent"
  | "rarity"
  | "last_sale"
  | "venue_asc";

/** Matches `VENUE_LABELS` key order in venue-badge.tsx */
const VENUE_PARTNER_SORT_ORDER: TradePartnerId[] = [
  "collector_crypt",
  "phygitals",
  "magic_eden",
  "slabvault_treasury",
  "beezie",
  "courtyard",
];

function venueSortIndex(partner: TradePartnerId | undefined): number {
  if (!partner) return VENUE_PARTNER_SORT_ORDER.length;
  const index = VENUE_PARTNER_SORT_ORDER.indexOf(partner);
  return index >= 0 ? index : VENUE_PARTNER_SORT_ORDER.length;
}

function acquiredAtMs(value: string | Date): number {
  const date = value instanceof Date ? value : new Date(value);
  const ms = date.getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function gradeNumericForRarity(grade: string): number {
  const match = grade.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : -1;
}

/** Lower = rarer: Tensor rank when present, else invert slab grade (10 → 0). */
function raritySortKey(listing: TradeListing): number {
  if (listing.rarityRank != null && listing.rarityRank > 0) {
    return listing.rarityRank;
  }
  const grade = gradeNumericForRarity(listing.grade);
  return grade >= 0 ? 100 - grade : Number.MAX_SAFE_INTEGER;
}

function lastSaleSortKey(listing: TradeListing): number | null {
  if (listing.lastSaleSol != null && listing.lastSaleSol > 0) {
    return listing.lastSaleSol;
  }
  return null;
}

export function sortTradeListings(
  listings: TradeListing[],
  sort: TradeListingSort,
): TradeListing[] {
  const sorted = [...listings];

  switch (sort) {
    case "price_asc":
      return sorted.sort((a, b) => a.askSol - b.askSol);
    case "price_desc":
      return sorted.sort((a, b) => b.askSol - a.askSol);
    case "recent":
      return sorted.sort(
        (a, b) => acquiredAtMs(b.acquiredAt) - acquiredAtMs(a.acquiredAt),
      );
    case "venue_asc":
      return sorted.sort((a, b) => {
        const venueDiff = venueSortIndex(a.partner) - venueSortIndex(b.partner);
        return venueDiff !== 0 ? venueDiff : a.askSol - b.askSol;
      });
    default:
      return sorted;
  }
}

export function filterTradeListings(
  listings: TradeListing[],
  filters: TradeTraitFilters,
): TradeListing[] {
  let filtered = [...listings];

  if (filters.graders.length > 0) {
    const graderSet = new Set(filters.graders.map((g) => g.toUpperCase()));
    filtered = filtered.filter((listing) => {
      const grader = extractListingGrader(listing.grade);
      return grader != null && graderSet.has(grader);
    });
  }

  if (filters.partners.length > 0) {
    const partnerSet = new Set(filters.partners);
    filtered = filtered.filter((listing) => {
      const partner = resolveTradeListingPartner(listing);
      return partner != null && partnerSet.has(partner);
    });
  }

  if (filters.grades.length > 0) {
    const gradeSet = new Set(filters.grades);
    filtered = filtered.filter((listing) => gradeSet.has(listing.grade));
  }

  if (filters.minAskSol != null) {
    filtered = filtered.filter((listing) => listing.askSol >= filters.minAskSol!);
  }

  if (filters.maxAskSol != null) {
    filtered = filtered.filter((listing) => listing.askSol <= filters.maxAskSol!);
  }

  if (filters.searchQuery.trim()) {
    const query = filters.searchQuery.trim().toLowerCase();
    filtered = filtered.filter(
      (listing) =>
        listing.name.toLowerCase().includes(query) ||
        listing.grade.toLowerCase().includes(query),
    );
  }

  if (filters.setQuery.trim()) {
    const query = filters.setQuery.trim().toLowerCase();
    filtered = filtered.filter((listing) => {
      const setName = listing.setName?.trim().toLowerCase() ?? "";
      return setName.includes(query) || listing.name.toLowerCase().includes(query);
    });
  }

  return filtered;
}
