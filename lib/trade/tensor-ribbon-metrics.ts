import { resolveTensorSlugForCollection } from "@/lib/onchain/clients/tensor-tcm";
import {
  fetchTensorCollectionStats,
  type TensorCollectionStats,
} from "@/lib/onchain/tensor-api";
import { withTimeoutFallback } from "@/lib/fetch-with-timeout";
import { isTensorReadConfigured } from "@/lib/integrations/tensor";
import {
  ensureCollectionStatsRibbonFromListings,
  enrichTradeCollectionStatsWithActivity,
  type TradeActivityEvent,
  type TradeCollectionStats,
  type TradeListing,
} from "@/lib/trade-listings";

/** Optional Tensor statsV2 fields mapped for GRAILS stats ribbon + index table. */
export type TensorRibbonMetrics = {
  buyNowSol: number | null;
  sellNowSol: number | null;
  volume24hSol: number | null;
  volumeAllSol: number | null;
  sales24h: number | null;
  priceChange24hPct: number | null;
  supplyCount: number | null;
  listedCount: number | null;
  listedPct: number | null;
  /** Floor × supply (◎) — Tensor index market cap. */
  marketCapSol: number | null;
};

export type ResolvedStatsRibbonDisplay = {
  buyNow: string;
  sellNow: string;
  listed: string;
  volume24h: string;
  volumeAll: string;
  sales24h: string;
  priceChange24h: string;
  priceChange24hPct: number | null;
};

/** Listed % from counts when supply is known; otherwise Tensor pctListed. */
function resolveListedPct(
  listedCount: number,
  supplyCount: number | null,
  pctListed: number | null | undefined,
): number | null {
  if (supplyCount != null && supplyCount > 0) {
    return Math.round((listedCount / supplyCount) * 100);
  }
  return pctListed != null ? Math.round(pctListed) : null;
}

export function mapTensorStatsToRibbonMetrics(
  stats: TensorCollectionStats,
): TensorRibbonMetrics {
  const sellNowSol = stats.floorPriceSol;
  const supplyCount = stats.numMints ?? null;
  const listedPct = resolveListedPct(
    stats.numListed,
    supplyCount,
    stats.pctListed,
  );

  const marketCapSol =
    sellNowSol != null && supplyCount != null && supplyCount > 0
      ? Math.round(sellNowSol * supplyCount * 1000) / 1000
      : null;

  return {
    buyNowSol: sellNowSol,
    sellNowSol,
    volume24hSol: stats.volume24hSol,
    volumeAllSol: stats.volumeAllSol,
    sales24h: stats.sales24h,
    priceChange24hPct: stats.priceChange24hPct,
    supplyCount,
    listedCount: stats.numListed ?? null,
    listedPct,
    marketCapSol,
  };
}

/** Partner desk stats — listing proxies, optional activity sales, then Tensor overlay. */
export function resolveCollectionDeskStats(
  stats: TradeCollectionStats,
  listings: TradeListing[],
  activityEvents: TradeActivityEvent[] = [],
): TradeCollectionStats {
  const withListings = ensureCollectionStatsRibbonFromListings(stats, listings);
  return activityEvents.length > 0
    ? enrichTradeCollectionStatsWithActivity(withListings, activityEvents)
    : withListings;
}

/** Merge ingest stats with Tensor statsV2 for collection desk ribbon cells. */
export function resolveStatsRibbonDisplay(
  stats: TradeCollectionStats,
  tensor?: TensorRibbonMetrics | null,
  listings?: TradeListing[],
): ResolvedStatsRibbonDisplay {
  const ingestStats =
    listings && listings.length > 0
      ? ensureCollectionStatsRibbonFromListings(stats, listings)
      : stats;

  const buyNowSol = tensor?.buyNowSol ?? ingestStats.floorSol;
  const sellNowSol = tensor?.sellNowSol ?? ingestStats.floorSol;
  const supplyCount = tensor?.supplyCount ?? null;
  const listedCount = tensor?.listedCount ?? ingestStats.listedCount;
  const listedPct = resolveListedPct(
    listedCount,
    supplyCount,
    tensor?.listedPct,
  );

  const listedValue =
    listedPct != null && supplyCount != null
      ? `${listedCount} / ${supplyCount} (${listedPct}%)`
      : listedPct != null
        ? `${listedCount} (${listedPct}%)`
        : String(listedCount);

  const volume24hSol =
    tensor?.volume24hSol ?? ingestStats.volume24hSol ?? null;
  const volumeAllSol = tensor?.volumeAllSol ?? ingestStats.volumeAllSol ?? null;
  const sales24h = tensor?.sales24h ?? ingestStats.sales24h ?? null;
  const priceChange24hPct =
    tensor?.priceChange24hPct ?? ingestStats.priceChange24hPct ?? null;

  return {
    buyNow: formatSolAmount(buyNowSol),
    sellNow: formatSolAmount(sellNowSol),
    listed: listedValue,
    volume24h: formatSolAmount(volume24hSol),
    volumeAll: formatSolAmount(volumeAllSol),
    sales24h: sales24h != null ? String(sales24h) : "—",
    priceChange24h: formatPriceChange24h(priceChange24hPct),
    priceChange24hPct,
  };
}

function formatSolAmount(sol: number | null | undefined): string {
  return sol != null ? `${sol} ◎` : "—";
}

export function formatPriceChange24h(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

/** Fetch Tensor collection stats when slug is configured and API key is set. */
export async function fetchTensorRibbonMetricsForCollection(
  collectionSlug: string,
): Promise<TensorRibbonMetrics | null> {
  const tensorSlug = resolveTensorSlugForCollection(collectionSlug);
  if (!tensorSlug || !isTensorReadConfigured()) return null;

  try {
    const stats = await withTimeoutFallback(
      fetchTensorCollectionStats(tensorSlug),
      null,
      12_000,
      "Tensor ribbon metrics",
    );
    return stats ? mapTensorStatsToRibbonMetrics(stats) : null;
  } catch {
    return null;
  }
}

/** Parallel Tensor reads for landing index rows (skips unconfigured slugs). */
export async function fetchTensorRibbonMetricsByCollectionSlug(
  collectionSlugs: string[],
): Promise<Map<string, TensorRibbonMetrics>> {
  const unique = [...new Set(collectionSlugs)];
  const entries = await Promise.all(
    unique.map(async (slug) => {
      const metrics = await fetchTensorRibbonMetricsForCollection(slug);
      return [slug, metrics] as const;
    }),
  );

  const map = new Map<string, TensorRibbonMetrics>();
  for (const [slug, metrics] of entries) {
    if (metrics) map.set(slug, metrics);
  }
  return map;
}
