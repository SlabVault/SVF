import { cn } from "@/lib/utils";
import type { TradeLandingStats } from "@/lib/trade-landing";

type PulseAggregate = {
  listedCount: number;
  floorSol: number | null;
  volume24hSol: number | null;
};

type Props = {
  aggregate: PulseAggregate;
  stats: TradeLandingStats;
  className?: string;
};

function formatSolStat(sol: number | null | undefined): string {
  if (sol == null || !Number.isFinite(sol)) return "—";
  return `${sol} ◎`;
}

/** Platform market pulse — partner floors, listed depth, honest ingest status. */
export function TradeLandingMarketPulse({ aggregate, stats, className }: Props) {
  const dataLabel = stats.listingDataReady
    ? stats.listingDataLabel
    : "Awaiting partner ingest";

  return (
    <section
      className={cn("trade-landing-market-pulse mb-3", className)}
      aria-label="Platform market pulse"
    >
      <div className="trade-stats-box trade-landing-market-pulse__ribbon rounded-lg">
        <div className="trade-stat-cell min-w-[5.5rem] shrink-0 flex-1 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--trade-muted)]">
            Partner listed
          </p>
          <p className="trade-stat-value mt-0.5 font-mono text-sm font-bold tabular-nums text-[var(--tensor-white)]/90">
            {aggregate.listedCount > 0 ? aggregate.listedCount : "—"}
          </p>
        </div>
        <div className="trade-stat-cell trade-stat-cell--buy min-w-[5.5rem] shrink-0 flex-1 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--trade-muted)]">
            Best floor
          </p>
          <p className="trade-stat-value mt-0.5 font-mono text-sm font-bold tabular-nums text-emerald-300">
            {formatSolStat(aggregate.floorSol)}
          </p>
        </div>
        <div className="trade-stat-cell min-w-[5.5rem] shrink-0 flex-1 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--trade-muted)]">
            24h vol
          </p>
          <p className="trade-stat-value mt-0.5 font-mono text-sm font-bold tabular-nums text-[var(--tensor-white)]/90">
            {formatSolStat(aggregate.volume24hSol)}
          </p>
        </div>
        <div className="trade-stat-cell min-w-[4.5rem] shrink-0 flex-1 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--trade-muted)]">
            Venues
          </p>
          <p className="trade-stat-value mt-0.5 font-mono text-sm font-bold tabular-nums text-[var(--tensor-white)]/90">
            {stats.venueCount}
          </p>
        </div>
        <div className="trade-stat-cell min-w-[7rem] shrink-0 flex-[1.3] px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--trade-muted)]">
            Data
          </p>
          <p
            className={cn(
              "mt-0.5 text-[11px] font-semibold leading-snug",
              stats.listingDataReady
                ? "text-emerald-400"
                : "text-[var(--trade-muted)]",
            )}
            title={dataLabel}
          >
            {dataLabel}
          </p>
        </div>
      </div>
    </section>
  );
}
