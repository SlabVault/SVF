import type { TradeLandingCollectionPreview } from "@/lib/trade-landing";
import {
  computeTradeCollectionStats,
  type TradeListing,
} from "@/lib/trade-listings";

export type TradeLandingAggregateStats = {
  listedCount: number;
  floorSol: number | null;
  buyNowSol: number | null;
  sellNowSol: number | null;
  volume24hSol: number | null;
};

/** Merged `/trade/all` stats — overrides preview sum for listed/floor/buy/sell/vol. */
export type MergedAllListingsAggregateOverride = {
  listedCount: number;
  floorSol: number | null;
  buyNowSol: number | null;
  sellNowSol: number | null;
  volume24hSol?: number | null;
};

/** Apply deduped all-listings stats over per-collection preview sums. */
export function applyMergedAllListingsAggregateOverride(
  preview: TradeLandingAggregateStats,
  merged: MergedAllListingsAggregateOverride,
  options?: { listings?: TradeListing[] },
): TradeLandingAggregateStats {
  let volume24hSol = preview.volume24hSol ?? merged.volume24hSol ?? null;
  const listings = options?.listings;
  if (volume24hSol == null && listings && listings.length > 0) {
    volume24hSol = computeTradeCollectionStats(listings).volume24hSol ?? null;
  }

  return {
    ...preview,
    listedCount: merged.listedCount,
    floorSol: merged.floorSol,
    buyNowSol: merged.buyNowSol ?? merged.floorSol,
    sellNowSol: merged.sellNowSol ?? merged.floorSol,
    volume24hSol,
  };
}

/** Footer ticker + landing ribbon — sum listed, min floor, sum 24h vol across preview rows. */
export function getTradeLandingAggregateFromCollections(
  collections: TradeLandingCollectionPreview[],
): TradeLandingAggregateStats {
  const listedCount = collections.reduce(
    (sum, row) => sum + (row.listedCount ?? 0),
    0,
  );
  const floors = collections
    .map((row) =>
      row.floorSol != null ? Number.parseFloat(row.floorSol) : Number.NaN,
    )
    .filter((n) => Number.isFinite(n) && n > 0);
  const floorSol = floors.length > 0 ? Math.min(...floors) : null;
  const buyNowSol = floorSol;

  const sellNowValues = collections
    .filter((row) => (row.listedCount ?? 0) > 0)
    .map((row) => {
      const raw = row.sellNowSol ?? row.floorSol;
      return raw != null ? Number.parseFloat(raw) : Number.NaN;
    })
    .filter((n) => Number.isFinite(n) && n > 0);
  const sellNowSol =
    sellNowValues.length > 0 ? Math.min(...sellNowValues) : null;

  const volumes = collections
    .map((row) =>
      row.volume24hSol != null ? Number.parseFloat(row.volume24hSol) : Number.NaN,
    )
    .filter((n) => Number.isFinite(n) && n >= 0);
  const volume24hSol =
    volumes.length > 0
      ? Math.round(volumes.reduce((sum, n) => sum + n, 0) * 1000) / 1000
      : null;

  return { listedCount, floorSol, buyNowSol, sellNowSol, volume24hSol };
}
