import { TensorStatsGrid } from "@/components/trade/tensor/stats-grid";
import type { TensorRibbonMetrics } from "@/lib/trade/tensor-ribbon-metrics";
import type { TradeCollectionStats } from "@/lib/trade-listings";
import { cn } from "@/lib/utils";

type Props = {
  stats: TradeCollectionStats;
  collectionName: string;
  tensorRibbon?: TensorRibbonMetrics | null;
  /** Aggregate desk — distinct partner venues with listings. */
  venuesCount?: number;
  className?: string;
};

/** Tensor-style collection header stats — delegates to ported template stats grid. */
export function CollectionStatsRibbon(props: Props) {
  return <TensorStatsGrid {...props} className={cn("mb-3", props.className)} />;
}

/** @deprecated Use CollectionStatsRibbon */
export { CollectionStatsRibbon as TradeStatsStrip };
