import { TRADE_GRID_CLASS } from "@/lib/layout";
import { cn } from "@/lib/utils";

type Props = {
  /** When true, tiles render as muted skeleton placeholders. */
  skeleton?: boolean;
  className?: string;
};

const PLACEHOLDER_COUNT = 8;

/** Tensor-style empty inventory grid — no fake holdings. */
export function TradePortfolioEmptyGrid({ skeleton = false, className }: Props) {
  return (
    <div
      className={cn(TRADE_GRID_CLASS, className)}
      aria-hidden={skeleton}
      role={skeleton ? undefined : "presentation"}
    >
      {Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => (
        <div
          key={index}
          className={cn(
            "aspect-square rounded border border-dashed border-[#333] bg-[var(--trade-panel)]/40",
            skeleton && "animate-pulse bg-[var(--trade-panel)]/60",
          )}
        />
      ))}
    </div>
  );
}
