"use client";

import Link from "next/link";
import { useState } from "react";

import { TradePortfolioEmptyGrid } from "@/components/trade/trade-portfolio-empty-grid";
import {
  PORTFOLIO_TABS,
  portfolioTabHref,
  type PortfolioTabId,
} from "@/lib/trade/portfolio";
import { cn } from "@/lib/utils";

const RECEIVED_OFFERS_TAB_LABEL = "RECEIVED OFFERS";

type Props = {
  activeTab: PortfolioTabId;
  className?: string;
};

/** Tensor portfolio main tabs â€” syncs via href query. */
export function TradePortfolioTabs({ activeTab, className }: Props) {
  return (
    <nav
      className={cn(
        "flex gap-1 overflow-x-auto border-b border-[#333] px-3 [scrollbar-width:thin]",
        className,
      )}
      aria-label="Portfolio sections"
      role="tablist"
    >
      {PORTFOLIO_TABS.map((tab) => {
        const { id, label } = tab;
        const soon = "soon" in tab ? tab.soon : false;
        const active = activeTab === id;
        return (
          <Link
            key={id}
            href={portfolioTabHref(id)}
            role="tab"
            aria-selected={active}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wide transition-colors",
              active
                ? "border-[var(--tensor-accent)] text-[var(--tensor-white)]"
                : "border-transparent text-[var(--trade-muted)] hover:text-[var(--tensor-white)]",
            )}
          >
            {label}
            {soon ? (
              <span className="ml-1 text-[8px] font-normal normal-case text-[var(--trade-muted)]">
                Soon
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Tensor portfolio received-offers tab — honest Soon shell, no placeholder bids. */
export function TradePortfolioReceivedOffersShell() {
  return (
    <div className="space-y-4 p-3 sm:p-4">
      <div
        className="rounded border border-[#333] bg-[var(--trade-surface)] px-4 py-8 text-center sm:px-8"
        role="status"
      >
        <p className="text-sm font-medium text-[var(--tensor-white)]">
          {RECEIVED_OFFERS_TAB_LABEL}
          <span className="ml-1.5 text-[10px] font-normal normal-case text-[var(--trade-muted)]">
            Soon
          </span>
        </p>
        <p className="mx-auto mt-2 max-w-md text-xs text-[var(--trade-muted)]">
          Offers on your listed slabs will appear here once Tensor TCM offer indexing syncs
          to your wallet. No placeholder bids are shown.
        </p>
      </div>
      <TradePortfolioEmptyGrid />
    </div>
  );
}

const PORTFOLIO_ORDER_COLUMNS = [
  "Type",
  "Collection",
  "Traits",
  "SOL",
  "Buy Now",
  "Sell Now",
  "NFTs",
  "Bought",
  "Sold",
  "Created",
  "Actions",
] as const;

/** Tensor portfolio ORDERS & BIDS tab — table shell, no placeholder rows. */
export function TradePortfolioOrdersShell() {
  const [nonEmptyOnly, setNonEmptyOnly] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 sm:p-4">
      <div
        className="overflow-hidden rounded border border-[#333] bg-[var(--trade-surface)]"
        role="region"
        aria-label="Portfolio orders"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#333] bg-[var(--trade-panel)] px-3 py-2">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tensor-accent)] hover:underline"
              aria-current="page"
            >
              All Collections
            </button>
            <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-[var(--trade-muted)]">
              <input
                type="checkbox"
                checked={nonEmptyOnly}
                onChange={(event) => setNonEmptyOnly(event.target.checked)}
                className="size-3 rounded border-[#555] bg-[var(--trade-surface)] accent-[var(--tensor-accent)]"
              />
              Non-empty only
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded border border-[#333] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--trade-muted)] hover:text-[var(--tensor-white)]"
              aria-label="Filter portfolio orders"
              disabled
              title="Filter — coming soon"
            >
              Filter
            </button>
            <button
              type="button"
              className="rounded border border-[#333] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--trade-muted)] hover:text-[var(--tensor-white)]"
              aria-label="Refresh portfolio orders"
              disabled
              title="Refresh — no orders API yet"
            >
              Refresh
            </button>
            <span className="font-mono text-[10px] tabular-nums text-[var(--trade-muted)]">
              0 / 0
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#333] bg-[var(--trade-panel)] text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
                {PORTFOLIO_ORDER_COLUMNS.map((column) => (
                  <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={PORTFOLIO_ORDER_COLUMNS.length} className="px-6 py-12 text-center">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[var(--tensor-white)]">
                    No open orders in your portfolio
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-xs text-[var(--trade-muted)]">
                    Wallet-linked listings and bids will appear here when the read path is
                    enabled. Placed offers stay on the PLACED OFFERS tab. No placeholder rows
                    are shown.
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
