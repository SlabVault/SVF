"use client";

import { Button } from "@/components/ui/button";
import { TradePortfolioEmptyGrid } from "@/components/trade/trade-portfolio-empty-grid";
import { cn } from "@/lib/utils";

type Props = {
  addressDraft: string;
  addressError: string | null;
  onAddressDraftChange: (value: string) => void;
  onConnect: () => void;
  onView: () => void;
  className?: string;
};

/** Tensor /portfolio logged-out shell — CONNECT WALLET or address + VIEW. */
export function TradePortfolioPublicShell({
  addressDraft,
  addressError,
  onAddressDraftChange,
  onConnect,
  onView,
  className,
}: Props) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="mx-auto w-full max-w-md flex-1 px-3 py-4 sm:px-4 sm:py-5">
        <section className="space-y-3 text-center">
          <h1 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--tensor-white)]">
            Connect Wallet
          </h1>
          <Button
            type="button"
            className="tensor-btn-primary mx-auto !w-full max-w-[11.5rem] text-[11px] font-bold uppercase tracking-wide"
            onClick={onConnect}
            data-growth-event="cta_connect_wallet_trade_portfolio"
            data-growth-context="trade_portfolio_connect_shell"
          >
            Connect wallet
          </Button>
        </section>

        <div
          className="my-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)]"
          aria-hidden
        >
          <span className="h-px flex-1 bg-[#333]" />
          <span>Or</span>
          <span className="h-px flex-1 bg-[#333]" />
        </div>

        <section className="space-y-2">
          <h2 className="text-center text-[13px] font-semibold uppercase tracking-wide text-[var(--tensor-white)]">
            Enter Wallet Address
          </h2>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              onView();
            }}
          >
            <input
              type="text"
              value={addressDraft}
              onChange={(event) => onAddressDraftChange(event.target.value)}
              placeholder="Wallet address"
              spellCheck={false}
              autoComplete="off"
              aria-label="Wallet address"
              aria-invalid={addressError != null}
              className="h-9 min-w-0 flex-1 rounded border border-[#333] bg-[var(--trade-panel)] px-3 font-mono text-[11px] text-[var(--tensor-white)] placeholder:text-[var(--trade-muted)]"
            />
            <Button
              type="submit"
              variant="secondary"
              className="h-9 shrink-0 px-4 text-[10px] font-bold uppercase tracking-wide"
              data-growth-event="cta_trade_portfolio_view_address"
              data-growth-context="trade_portfolio_view_shell"
            >
              View
            </Button>
          </form>
          {addressError ? (
            <p className="text-center text-[10px] text-red-400" role="alert">
              {addressError}
            </p>
          ) : null}
        </section>
      </div>

      <div className="border-t border-[#333] px-3 py-3 sm:px-4">
        <TradePortfolioEmptyGrid skeleton />
      </div>
    </div>
  );
}
