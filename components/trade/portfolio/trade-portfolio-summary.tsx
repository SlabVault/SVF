import {
  formatPortfolioSol,
  summarizePortfolio,
  type PortfolioNft,
} from "@/lib/trade/portfolio";
import { cn } from "@/lib/utils";

type Props = {
  nfts: PortfolioNft[];
  collectionLabel?: string;
  className?: string;
};

/** Tensor portfolio summary ribbon — listed, est value, P&L. */
export function TradePortfolioSummary({
  nfts,
  collectionLabel = "ALL COLLECTIONS",
  className,
}: Props) {
  const stats = summarizePortfolio(nfts);

  return (
    <div
      className={cn(
        "trade-portfolio-summary flex overflow-x-auto border-b border-[#333] bg-[var(--trade-surface)]",
        className,
      )}
    >
      <SummaryCell
        label={`${stats.totalCount} ${collectionLabel}`}
        value=""
        wide
        hideValue
      />
      <SummaryCell label="LISTED" value={`${stats.listedCount}/${stats.totalCount}`} />
      <SummaryCell label="EST VALUE" value={`${formatPortfolioSol(stats.estValueSol, 2)} ◎`} />
      <SummaryCell label="COST" value="—" />
      <SummaryCell
        label="UNREALIZED P&L"
        value={
          stats.unrealizedPnlSol != null
            ? `${formatPortfolioSol(stats.unrealizedPnlSol, 2)} ◎`
            : "—"
        }
      />
    </div>
  );
}

function SummaryCell({
  label,
  value,
  wide = false,
  hideValue = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
  hideValue?: boolean;
}) {
  return (
    <div
      className={cn(
        "shrink-0 border-r border-[#333] px-3 py-2 last:border-r-0",
        wide ? "min-w-[8rem] flex-[1.2]" : "min-w-[5.5rem] flex-1",
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--trade-muted)]">
        {label}
      </p>
      {hideValue ? null : (
        <p className="mt-0.5 font-mono text-[11px] tabular-nums text-[var(--tensor-white)]">
          {value}
        </p>
      )}
    </div>
  );
}
