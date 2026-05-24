"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  filterVisibleCollectionBids,
  formatCollectionBidSol,
  formatCollectionBidTime,
  formatCollectionBidWallet,
  type CollectionBidsFeedResult,
} from "@/lib/trade/collection-bids";
import { cn } from "@/lib/utils";

type Props = {
  collectionSlug: string;
  className?: string;
};

const BID_COLUMNS = ["Price", "Qty", "Traits", "Bidder", "Time"] as const;

export function CollectionBidsPanel({ collectionSlug, className }: Props) {
  const [feed, setFeed] = useState<CollectionBidsFeedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hideTraitBids, setHideTraitBids] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/trade/collection-bids?slug=${encodeURIComponent(collectionSlug)}&limit=50`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? `Bids fetch failed (${response.status})`);
      }
      const payload = (await response.json()) as CollectionBidsFeedResult;
      setFeed(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bids.");
      setFeed(null);
    } finally {
      setLoading(false);
    }
  }, [collectionSlug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visibleBids = useMemo(
    () => (feed ? filterVisibleCollectionBids(feed.bids, hideTraitBids) : []),
    [feed, hideTraitBids],
  );
  const totalCount = feed?.bids.length ?? 0;
  const shownCount = visibleBids.length;

  return (
    <div
      className={cn(
        "overflow-hidden rounded border border-[#333] bg-[var(--trade-surface)]",
        className,
      )}
      role="region"
      aria-label="Collection bids"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#333] bg-[var(--trade-panel)] px-3 py-2">
        <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-[var(--trade-muted)]">
          <input
            type="checkbox"
            checked={hideTraitBids}
            onChange={(event) => setHideTraitBids(event.target.checked)}
            className="size-3 rounded border-[#555] bg-[var(--trade-surface)] accent-[var(--tensor-accent)]"
          />
          Hide trait bids
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="rounded border border-[#333] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--trade-muted)] hover:text-[var(--tensor-white)] disabled:opacity-50"
            aria-label="Refresh collection bids"
          >
            Refresh
          </button>
          <span className="font-mono text-[10px] tabular-nums text-[var(--trade-muted)]">
            {shownCount} / {totalCount}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#333] bg-[var(--trade-panel)] text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
              {BID_COLUMNS.map((column) => (
                <th
                  key={column}
                  className={cn(
                    "px-3 py-1.5 font-semibold whitespace-nowrap",
                    column === "Time" && "hidden sm:table-cell",
                  )}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={BID_COLUMNS.length}
                  className="px-3 py-8 text-center text-xs text-[var(--trade-muted)]"
                  role="status"
                >
                  Loading bids…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={BID_COLUMNS.length} className="px-6 py-10 text-center" role="alert">
                  <p className="text-xs text-[var(--trade-muted)]">{error}</p>
                  <button
                    type="button"
                    onClick={() => void refresh()}
                    className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--tensor-accent)] hover:underline"
                  >
                    Retry
                  </button>
                </td>
              </tr>
            ) : !feed?.configured ? (
              <tr>
                <td colSpan={BID_COLUMNS.length} className="px-6 py-12 text-center" role="status">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[var(--tensor-white)]">
                    No bids — configure TENSOR_API_KEY
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-xs text-[var(--trade-muted)]">
                    Collection bid pools from the Tensor index appear here when the API key is set.
                  </p>
                </td>
              </tr>
            ) : totalCount === 0 ? (
              <tr>
                <td colSpan={BID_COLUMNS.length} className="px-6 py-12 text-center" role="status">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[var(--tensor-white)]">
                    No open collection bids
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-xs text-[var(--trade-muted)]">
                    Active collection bids from the Tensor index will appear here when available.
                    No placeholder rows are shown.
                  </p>
                </td>
              </tr>
            ) : shownCount === 0 ? (
              <tr>
                <td
                  colSpan={BID_COLUMNS.length}
                  className="px-6 py-10 text-center text-xs text-[var(--trade-muted)]"
                  role="status"
                >
                  No collection-wide bids — turn off Hide trait bids to see trait-specific pools.
                </td>
              </tr>
            ) : (
              visibleBids.map((bid) => {
                const timeLabel = formatCollectionBidTime(bid.blockTime);
                const traitsLabel =
                  bid.traitsSummary?.trim() && bid.traitsSummary !== "ALL"
                    ? bid.traitsSummary
                    : "All traits";

                return (
                  <tr
                    key={bid.bidStateAddress}
                    className="border-b border-[#333]/70 last:border-b-0 hover:bg-[var(--trade-panel)]/40"
                  >
                    <td className="px-3 py-1.5 font-mono text-xs font-semibold tabular-nums text-[var(--tensor-white)]">
                      {formatCollectionBidSol(bid.priceSol)} ◎
                    </td>
                    <td className="px-3 py-1.5 font-mono tabular-nums text-[var(--tensor-white)]">
                      {bid.quantity ?? "—"}
                    </td>
                    <td className="max-w-[12rem] truncate px-3 py-1.5 text-[10px] text-[var(--trade-muted)]">
                      {traitsLabel}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-[var(--trade-muted)]">
                      {bid.bidderWallet
                        ? formatCollectionBidWallet(bid.bidderWallet)
                        : "—"}
                    </td>
                    <td className="hidden px-3 py-1.5 font-mono text-[10px] text-[var(--trade-muted)] sm:table-cell">
                      {timeLabel ?? "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
