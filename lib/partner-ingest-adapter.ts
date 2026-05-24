/**
 * Partner ingest adapter contract — one interface per graded-card venue.
 *
 * @see docs/trade-architecture.md
 */

import type { TradeChainId, TradePartnerId } from "@/lib/onchain/collections";
import { getTradeCollectionBySlug } from "@/lib/onchain/collections";
import {
  fetchPhygitalsPartnerIngest,
  getPartnerStatsForPlatform,
  listPartnerTradeListings,
  partnerPlatformToSlug,
  parsePartnerPlatformParam,
  resolvePartnerDeepLink,
  type PartnerPlatformParam,
  type PartnerTradeListingsResult,
} from "@/lib/partner-listings";
import { PHYGITALS_LIVE_INGEST_AVAILABLE } from "@/lib/phygitals-listings";
import type {
  TradeCollectionStats,
  TradeListing,
} from "@/lib/trade-listings";

/** Honest Phygitals ingest leg — live API gated until partner API ships. */
export type PhygitalsIngestMode = "seed-only" | "live";

export function getPhygitalsIngestMode(): PhygitalsIngestMode {
  return PHYGITALS_LIVE_INGEST_AVAILABLE ? "live" : "seed-only";
}

export type PartnerSettlementMode =
  | "on_chain_tensor"
  | "partner_site"
  | "vault_tcm";

export type PartnerIngestResult = {
  listings: TradeListing[];
  stats: TradeCollectionStats;
  fromFallback: boolean;
  dbStatus: "connected" | "unreachable" | "unconfigured";
  sources: string[];
};

/** Implement per partner (CC, Phygitals, Beezie, Courtyard). */
export type PartnerIngestAdapter = {
  partner: TradePartnerId;
  chain: TradeChainId;
  settlementMode: PartnerSettlementMode;
  fetchListings: (options?: { includeLiveScrape?: boolean }) => Promise<PartnerIngestResult>;
  fetchStats?: (options?: { includeLiveScrape?: boolean }) => Promise<TradeCollectionStats>;
  resolveDeepLink?: (listing: TradeListing) => string | null;
};

const EMPTY_STATS: TradeCollectionStats = {
  listedCount: 0,
  floorSol: null,
  topAskSol: null,
  totalFmvUsd: null,
};

/** Preview partners (M6) — honest empty index until API ingest ships. */
const PREVIEW_STUB_INGEST: PartnerIngestResult = {
  listings: [],
  stats: EMPTY_STATS,
  fromFallback: true,
  dbStatus: "unconfigured",
  sources: [],
};

function ingestResultFromTradeResult(
  result: PartnerTradeListingsResult,
): PartnerIngestResult {
  return {
    listings: result.listings,
    stats: result.stats,
    fromFallback: result.fromFallback,
    dbStatus: result.dbStatus,
    sources: result.sources,
  };
}

const COLLECTOR_CRYPT_COLLECTION = getTradeCollectionBySlug(
  partnerPlatformToSlug("collector_crypt"),
);

const PHYGITALS_COLLECTION = getTradeCollectionBySlug(
  partnerPlatformToSlug("phygitals"),
);

/** Collector Crypt — delegates to `lib/partner-listings.ts` (no Tensor API key required). */
export const collectorCryptIngestAdapter: PartnerIngestAdapter = {
  partner: "collector_crypt",
  chain: COLLECTOR_CRYPT_COLLECTION?.chain ?? "solana",
  settlementMode:
    (COLLECTOR_CRYPT_COLLECTION?.settlementMode as PartnerSettlementMode) ??
    "on_chain_tensor",
  async fetchListings(options) {
    const collection =
      COLLECTOR_CRYPT_COLLECTION ??
      getTradeCollectionBySlug(partnerPlatformToSlug("collector_crypt"));
    if (!collection) {
      return {
        listings: [],
        stats: EMPTY_STATS,
        fromFallback: false,
        dbStatus: "unconfigured",
        sources: [],
      };
    }

    return ingestResultFromTradeResult(
      await listPartnerTradeListings(collection, options),
    );
  },
  async fetchStats(options) {
    const result = await getPartnerStatsForPlatform("collector_crypt", options);
    return result?.stats ?? EMPTY_STATS;
  },
  resolveDeepLink(listing) {
    return resolvePartnerDeepLink(listing, "collector_crypt");
  },
};

/** Phygitals — seed/JSON + DB only; live API gated by `PHYGITALS_LIVE_INGEST_AVAILABLE`. */
export const phygitalsIngestAdapter: PartnerIngestAdapter = {
  partner: "phygitals",
  chain: PHYGITALS_COLLECTION?.chain ?? "solana",
  settlementMode:
    (PHYGITALS_COLLECTION?.settlementMode as PartnerSettlementMode) ??
    "on_chain_tensor",
  async fetchListings(options) {
    return {
      ...ingestResultFromTradeResult(await fetchPhygitalsPartnerIngest(options)),
      ingestMode: getPhygitalsIngestMode(),
    };
  },
  async fetchStats(options) {
    const result = await fetchPhygitalsPartnerIngest(options);
    return result.stats;
  },
  resolveDeepLink(listing) {
    return resolvePartnerDeepLink(listing, "phygitals");
  },
};

/** Beezie (Base) — preview stub until partner API ingest ships (M6). */
export const beezieIngestAdapter: PartnerIngestAdapter = {
  partner: "beezie",
  chain: getTradeCollectionBySlug("beezie")?.chain ?? "base",
  settlementMode: "partner_site",
  async fetchListings() {
    return PREVIEW_STUB_INGEST;
  },
  async fetchStats() {
    return EMPTY_STATS;
  },
};

/** Courtyard (Polygon) — preview stub until partner API ingest ships (M6). */
export const courtyardIngestAdapter: PartnerIngestAdapter = {
  partner: "courtyard",
  chain: getTradeCollectionBySlug("courtyard")?.chain ?? "polygon",
  settlementMode: "partner_site",
  async fetchListings() {
    return PREVIEW_STUB_INGEST;
  },
  async fetchStats() {
    return EMPTY_STATS;
  },
};

const ADAPTER_BY_PLATFORM: ReadonlyMap<PartnerPlatformParam, PartnerIngestAdapter> =
  new Map([
    ["collector_crypt", collectorCryptIngestAdapter],
    ["phygitals", phygitalsIngestAdapter],
  ]);

const ADAPTER_BY_PARTNER: Partial<Record<TradePartnerId, PartnerIngestAdapter>> = {
  collector_crypt: collectorCryptIngestAdapter,
  phygitals: phygitalsIngestAdapter,
  beezie: beezieIngestAdapter,
  courtyard: courtyardIngestAdapter,
};

/** Registry of live partner ingest adapters (CC, Phygitals). */
export function getPartnerIngestAdapters(): ReadonlyMap<
  PartnerPlatformParam,
  PartnerIngestAdapter
> {
  return ADAPTER_BY_PLATFORM;
}

export function getSupportedPartnerPlatformParams(): PartnerPlatformParam[] {
  return [...ADAPTER_BY_PLATFORM.keys()];
}

export function getPartnerIngestAdapter(
  partner: TradePartnerId,
): PartnerIngestAdapter | null {
  return ADAPTER_BY_PARTNER[partner] ?? null;
}

export function resolvePartnerIngestAdapter(platformParam: string): {
  platform: PartnerPlatformParam;
  slug: string;
  adapter: PartnerIngestAdapter;
} | null {
  const platform = parsePartnerPlatformParam(platformParam);
  if (!platform) return null;

  const adapter = ADAPTER_BY_PLATFORM.get(platform);
  if (!adapter) return null;

  return {
    platform,
    slug: partnerPlatformToSlug(platform),
    adapter,
  };
}

export type PartnerIngestPlatformResult = {
  platform: PartnerPlatformParam;
  slug: string;
} & PartnerIngestResult;

/** BFF — `/api/trade/partners/[platform]/listings` via adapter registry. */
export async function fetchPartnerIngestListingsForPlatform(
  platformParam: string,
  options?: { includeLiveScrape?: boolean },
): Promise<PartnerIngestPlatformResult | null> {
  const resolved = resolvePartnerIngestAdapter(platformParam);
  if (!resolved) return null;

  const ingest = await resolved.adapter.fetchListings(options);
  return {
    platform: resolved.platform,
    slug: resolved.slug,
    ...ingest,
  };
}

export type PartnerIngestStatsPlatformResult = {
  platform: PartnerPlatformParam;
  slug: string;
  stats: TradeCollectionStats;
  fromFallback: boolean;
  dbStatus: PartnerIngestResult["dbStatus"];
  sources: PartnerIngestResult["sources"];
  readConfigured: boolean;
};

/** BFF — `/api/trade/partners/[platform]/stats` via adapter registry. */
export async function fetchPartnerIngestStatsForPlatform(
  platformParam: string,
  options?: { includeLiveScrape?: boolean },
): Promise<PartnerIngestStatsPlatformResult | null> {
  const resolved = resolvePartnerIngestAdapter(platformParam);
  if (!resolved) return null;

  const ingest = await resolved.adapter.fetchListings(options);
  const stats =
    resolved.adapter.fetchStats != null
      ? await resolved.adapter.fetchStats(options)
      : ingest.stats;

  return {
    platform: resolved.platform,
    slug: resolved.slug,
    stats,
    fromFallback: ingest.fromFallback,
    dbStatus: ingest.dbStatus,
    sources: ingest.sources,
    readConfigured: stats.listedCount > 0,
  };
}
