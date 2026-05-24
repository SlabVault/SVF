import Link from "next/link";

import { computeLandingCollectionSpreadPct } from "@/components/trade/trade-landing-desk-client";
import { VenueBadge } from "@/components/trade/venue-badge";
import type { TradeLandingCollectionPreview } from "@/lib/trade-landing";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<TradeLandingCollectionPreview["status"], string> = {
  preview: "Preview",
  index_pending: "Index",
  live: "Live",
};

type Props = {
  collection: TradeLandingCollectionPreview;
  className?: string;
};

/** Tensor landing card — template tokens only (no vault marketing chrome). */
export function TradeCollectionIndexCard({ collection, className }: Props) {
  const spreadPct = computeLandingCollectionSpreadPct(collection);

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-[#333] bg-[var(--trade-panel)] transition-colors hover:border-[#555]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b border-[#333] px-3 py-2.5">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-[var(--tensor-white)]">
            {collection.name}
          </h3>
          {spreadPct != null ? (
            <p
              className={cn(
                "font-mono text-[10px] font-bold tabular-nums",
                spreadPct > 0 ? "text-pink-400" : "text-emerald-400",
              )}
            >
              Spread: {spreadPct.toFixed(2)}%
            </p>
          ) : null}
          <p className="line-clamp-2 text-[10px] leading-snug text-[var(--trade-muted)]">
            {collection.description}
          </p>
        </div>
        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
          {STATUS_LABELS[collection.status]}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
        <VenueBadge partner={collection.partner} />
        <span className="font-mono text-[9px] uppercase text-[var(--trade-muted)]">
          {collection.tokenStandard}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-2 border-t border-[#333] px-3 py-2.5 text-xs">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
            Floor
          </dt>
          <dd className="font-mono font-bold tabular-nums text-[var(--tensor-white)]">
            {collection.floorSol != null ? `${collection.floorSol} ◎` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
            Listed
          </dt>
          <dd className="font-mono font-bold tabular-nums text-[var(--tensor-white)]">
            {collection.listedCount != null ? collection.listedCount : "—"}
          </dd>
        </div>
      </dl>

      <Link
        href={collection.href}
        className="mt-auto border-t border-[#333] px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-[var(--tensor-accent)] transition-colors hover:bg-[var(--trade-surface)]"
        data-growth-event="trade_collection_index_card"
        data-growth-context={`trade_card:${collection.slug}`}
      >
        Open collection
      </Link>
    </article>
  );
}
