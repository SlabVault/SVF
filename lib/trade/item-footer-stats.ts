import {
  resolveStatsRibbonDisplay,
  type TensorRibbonMetrics,
} from "@/lib/trade/tensor-ribbon-metrics";
import type { TradeCollectionStats } from "@/lib/trade-listings";

export type ItemFooterStatCell = {
  label: string;
  value: string;
  deltaPct?: number | null;
};

export function formatListedSupply(
  stats: TradeCollectionStats,
  tensorRibbon?: TensorRibbonMetrics | null,
): string {
  return resolveStatsRibbonDisplay(stats, tensorRibbon).listed;
}

export function buildItemFooterStatCells(
  stats: TradeCollectionStats,
  collectionName: string,
  tensorRibbon?: TensorRibbonMetrics | null,
): ItemFooterStatCell[] {
  const ribbon = resolveStatsRibbonDisplay(stats, tensorRibbon);

  return [
    { label: "Collection", value: collectionName },
    { label: "Floor", value: ribbon.buyNow },
    { label: "Listed / supply", value: ribbon.listed },
    {
      label: "24h floor Δ",
      value: ribbon.priceChange24h,
      deltaPct: ribbon.priceChange24hPct,
    },
    { label: "24h vol", value: ribbon.volume24h },
    { label: "24h sales", value: ribbon.sales24h },
  ];
}
