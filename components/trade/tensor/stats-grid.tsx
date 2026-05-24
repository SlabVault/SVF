import {
  resolveStatsRibbonDisplay,
  type TensorRibbonMetrics,
} from "@/lib/trade/tensor-ribbon-metrics";
import type { TradeCollectionStats } from "@/lib/trade-listings";
import { cn } from "@/lib/utils";

type Props = {
  stats: TradeCollectionStats;
  collectionName: string;
  tensorRibbon?: TensorRibbonMetrics | null;
  venuesCount?: number;
  className?: string;
};

type StatTone = "buy" | "sell" | "neutral" | "delta";

/**
 * Tensor Pro stats ribbon — horizontal cells, mono pricing, 1px dividers.
 */
export function TensorStatsGrid({
  stats,
  tensorRibbon = null,
  venuesCount,
  className,
}: Props) {
  const ribbon = resolveStatsRibbonDisplay(stats, tensorRibbon);
  const priceChange24hPct = ribbon.priceChange24hPct;

  const cells: {
    label: string;
    value: string;
    tone: StatTone;
    wide?: boolean;
  }[] = [
    { label: "BUY NOW", value: ribbon.buyNow, tone: "buy" },
    { label: "SELL NOW", value: ribbon.sellNow, tone: "sell" },
    { label: "LISTED", value: ribbon.listed, tone: "neutral", wide: true },
    ...(venuesCount != null
      ? [
          {
            label: "Venues",
            value: String(venuesCount),
            tone: "neutral" as const,
          },
        ]
      : []),
    { label: "24H VOL", value: ribbon.volume24h, tone: "neutral" },
    { label: "VOLUME (ALL)", value: ribbon.volumeAll, tone: "neutral" },
    { label: "24H SALES", value: ribbon.sales24h, tone: "neutral" },
    { label: "24H PRICE Δ", value: ribbon.priceChange24h, tone: "delta" },
  ];

  return (
    <div
      className={cn(
        "trade-stats-ribbon mb-3 flex overflow-x-auto rounded border border-[#333] bg-[var(--trade-surface)]",
        className,
      )}
      role="group"
      aria-label="Collection statistics"
    >
      {cells.map((cell) => (
        <StatCell
          key={cell.label}
          {...cell}
          priceChange24hPct={priceChange24hPct}
        />
      ))}
    </div>
  );
}

function StatCell({
  label,
  value,
  tone,
  wide = false,
  priceChange24hPct = null,
}: {
  label: string;
  value: string;
  tone: StatTone;
  wide?: boolean;
  priceChange24hPct?: number | null;
}) {
  const deltaClass =
    tone === "delta" && priceChange24hPct != null
      ? priceChange24hPct >= 0
        ? "text-emerald-400"
        : "text-red-400"
      : null;

  return (
    <div
      className={cn(
        "trade-stat-cell shrink-0 border-r border-[#333] px-3 py-2 last:border-r-0",
        wide ? "min-w-[8rem] flex-[1.2]" : "min-w-[5.5rem] flex-1",
        tone === "buy" && "trade-stat-cell--buy",
        tone === "sell" && "trade-stat-cell--sell",
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--trade-muted)]">
        {label}
      </p>
      <p
        className={cn(
          "trade-stat-value mt-0.5 truncate font-mono text-sm font-bold tabular-nums text-[var(--tensor-white)]/90",
          tone === "buy" && "text-emerald-300",
          tone === "sell" && "text-red-300",
          deltaClass,
        )}
      >
        {value}
      </p>
    </div>
  );
}
