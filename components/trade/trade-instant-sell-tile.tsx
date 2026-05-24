"use client";

type Props = {
  floorSol: number;
  onSell: () => void;
  onAllBids?: () => void;
};

function formatInstantSellSol(floorSol: number): string {
  if (!Number.isFinite(floorSol)) return "—";
  const rounded = Math.round(floorSol * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2);
}

/** First grid cell — Tensor instant-sell CTA at collection floor. */
export function TradeInstantSellTile({ floorSol, onSell, onAllBids }: Props) {
  const priceLabel = formatInstantSellSol(floorSol);

  return (
    <article className="nft-card trade-listing-card trade-instant-sell-tile flex flex-col overflow-hidden">
      <div className="trade-instant-sell-tile__body flex flex-1 flex-col items-center justify-center gap-1.5 px-2 py-3 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--trade-muted)]">
          Instant sell
        </p>
        <p
          className="trade-instant-sell-price font-mono text-lg font-bold tabular-nums leading-none"
          aria-label={`Floor price ${priceLabel} SOL`}
        >
          {priceLabel} ◎
        </p>
      </div>
      <div className="grid grid-cols-2 gap-1 border-t border-[#333] p-1.5">
        <button
          type="button"
          className="tensor-btn-sweep h-7 text-[10px] font-bold uppercase tracking-wide"
          onClick={onSell}
          data-growth-event="trade_instant_sell_open"
        >
          SELL NOW
        </button>
        <button
          type="button"
          className="h-7 rounded border border-[#333] bg-[var(--trade-surface)] text-[10px] font-bold uppercase tracking-wide text-[var(--tensor-white)] hover:border-[var(--trade-sell-accent)] disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onAllBids}
          disabled={!onAllBids}
          title={onAllBids ? "View collection bids" : undefined}
        >
          ALL BIDS
        </button>
      </div>
    </article>
  );
}
