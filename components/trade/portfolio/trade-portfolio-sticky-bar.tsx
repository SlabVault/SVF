import { formatPortfolioItemCount } from "@/lib/trade/portfolio";
import {
  isTradeWriteEnabledClient,
  tradeWriteDisabledTooltip,
} from "@/lib/trade/trade-modal";
import { cn } from "@/lib/utils";

type Props = {
  listCount: number;
  delistCount: number;
  onList: () => void;
  onDelist: () => void;
  pending?: boolean;
  className?: string;
};

function stickyActionTitle(
  writeEnabled: boolean,
  count: number,
  pending: boolean,
): string | undefined {
  if (pending) return "Transaction in progress…";
  if (count === 0) return undefined;
  if (!writeEnabled) return tradeWriteDisabledTooltip();
  return undefined;
}

/** Tensor portfolio sticky LIST / DELIST bar. */
export function TradePortfolioStickyBar({
  listCount,
  delistCount,
  onList,
  onDelist,
  pending = false,
  className,
}: Props) {
  const writeEnabled = isTradeWriteEnabledClient();
  const listDisabled = listCount === 0 || pending;
  const delistDisabled = delistCount === 0 || pending;
  const listTitle = stickyActionTitle(writeEnabled, listCount, pending);
  const delistTitle = stickyActionTitle(writeEnabled, delistCount, pending);

  return (
    <div
      className={cn(
        "sticky bottom-0 z-30 flex items-center gap-2 border-t border-[#333] bg-[var(--tensor-black)] px-3 py-2",
        className,
      )}
    >
      <button
        type="button"
        disabled={listDisabled}
        onClick={onList}
        title={listTitle}
        className={cn(
          "flex-1 rounded py-2 text-[11px] font-bold uppercase tracking-wide",
          listDisabled
            ? "cursor-not-allowed bg-[var(--trade-panel)] text-[var(--trade-muted)]"
            : "tensor-btn-primary",
          !writeEnabled && listCount > 0 && !pending && "opacity-60",
        )}
      >
        LIST {formatPortfolioItemCount(listCount)}
      </button>
      <button
        type="button"
        disabled={delistDisabled}
        onClick={onDelist}
        title={delistTitle}
        className={cn(
          "flex-1 rounded border py-2 text-[11px] font-bold uppercase tracking-wide",
          delistDisabled
            ? "cursor-not-allowed border-[#333] bg-[var(--trade-panel)] text-[var(--trade-muted)]"
            : "border-[#333] bg-[var(--trade-surface)] text-[var(--tensor-white)] hover:border-[var(--tensor-accent)]",
          !writeEnabled && delistCount > 0 && !pending && "opacity-60",
        )}
      >
        DELIST {formatPortfolioItemCount(delistCount)}
      </button>
    </div>
  );
}
