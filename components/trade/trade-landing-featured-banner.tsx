import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  collectionName: string;
  tagline?: string | null;
  /** Primary TRADE CTA — collection desk route. */
  buyHref?: string | null;
  buyNowSol?: number | string | null;
  sellNowSol?: number | string | null;
  volume24hSol?: number | string | null;
  marketCapSol?: number | string | null;
  listedCount?: number | null;
  listedPct?: number | null;
  className?: string;
};

function parseSolValue(sol: number | string | null | undefined): number | null {
  if (sol == null) return null;
  const n = typeof sol === "string" ? Number.parseFloat(sol) : sol;
  return Number.isFinite(n) ? n : null;
}

function formatSolStat(sol: number | string | null | undefined) {
  const n = parseSolValue(sol);
  return n != null ? `${n} ◎` : "—";
}

function formatListedSupply(
  listedCount: number | null | undefined,
  listedPct: number | null | undefined,
) {
  if (listedCount == null) return "—";
  if (listedPct != null) return `${listedCount} (${listedPct}%)`;
  return String(listedCount);
}

function featuredVisualLabel(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "GRAILS";
  if (words.length === 1) return words[0]!.slice(0, 12).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Tensor-style featured collection hero — visual, tagline, dual buy/sell stats, aggregate ribbon. */
export function TradeLandingFeaturedBanner({
  collectionName,
  tagline = null,
  buyHref = null,
  buyNowSol = null,
  sellNowSol = null,
  volume24hSol = null,
  marketCapSol = null,
  listedCount = null,
  listedPct = null,
  className,
}: Props) {
  const tradeLabel = `Trade ${collectionName}`;

  return (
    <section
      className={cn("trade-landing-hero mb-3", className)}
      aria-label={`Featured collection: ${collectionName}`}
    >
      <div className="trade-landing-hero__panel overflow-hidden rounded border border-[#333] bg-[var(--trade-surface)]">
        <div className="trade-landing-hero__main flex flex-col gap-3 p-3 sm:flex-row sm:items-stretch sm:gap-4 sm:p-4">
          <div
            className="trade-landing-hero__visual relative flex min-h-[7.5rem] shrink-0 items-center justify-center overflow-hidden rounded border border-[#333] bg-[var(--trade-panel)] sm:min-h-0 sm:w-[42%]"
            aria-hidden
          >
            <span className="trade-landing-hero__wordmark select-none font-mono text-2xl font-bold uppercase tracking-[0.2em] text-[var(--tensor-white)]/90 sm:text-3xl">
              {featuredVisualLabel(collectionName)}
            </span>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#641ae6]/35 via-transparent to-emerald-500/15" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-stretch">
            <div className="trade-landing-hero__copy min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--trade-muted)]">
                Featured collection
              </p>
              <h2 className="mt-1 truncate text-lg font-bold text-[var(--tensor-white)] sm:text-xl">
                {collectionName}
              </h2>
              {tagline ? (
                <p className="mt-1 line-clamp-2 text-xs leading-snug text-[var(--trade-muted)]">
                  {tagline}
                </p>
              ) : null}
              <div className="mt-3">
                {buyHref ? (
                  <Button
                    asChild
                    className="tensor-btn-primary h-9 px-4 text-[11px] font-bold uppercase tracking-wide"
                  >
                    <Link
                      href={buyHref}
                      data-growth-event="cta_trade_landing_trade"
                      data-growth-context="trade_landing_hero"
                    >
                      {tradeLabel}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled
                    className="tensor-btn-primary h-9 px-4 text-[11px] font-bold uppercase tracking-wide opacity-50"
                  >
                    {tradeLabel}
                  </Button>
                )}
              </div>
            </div>

            <div className="trade-landing-hero__commerce flex shrink-0 gap-2 sm:w-[14.5rem] sm:flex-col">
              <div className="trade-stat-cell trade-stat-cell--buy min-w-[6.5rem] flex-1 rounded border border-[#333] px-3 py-2.5 sm:min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--trade-muted)]">
                  BUY NOW
                </p>
                <p className="trade-stat-value mt-1 font-mono text-base font-bold tabular-nums text-emerald-300 sm:text-lg">
                  {formatSolStat(buyNowSol)}
                </p>
              </div>
              <div className="trade-stat-cell trade-stat-cell--sell min-w-[6.5rem] flex-1 rounded border border-[#333] px-3 py-2.5 sm:min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--trade-muted)]">
                  SELL NOW
                </p>
                <p className="trade-stat-value mt-1 font-mono text-base font-bold tabular-nums text-red-300 sm:text-lg">
                  {formatSolStat(sellNowSol)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          className="trade-landing-ribbon flex overflow-x-auto border-t border-[#333]"
          aria-label="Featured collection market stats"
        >
          <div className="trade-stat-cell min-w-[5.5rem] shrink-0 flex-1 border-r border-[#333] px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--trade-muted)]">
              24H VOL
            </p>
            <p className="trade-stat-value mt-0.5 font-mono text-sm font-bold tabular-nums text-[var(--tensor-white)]/90">
              {formatSolStat(volume24hSol)}
            </p>
          </div>
          <div className="trade-stat-cell min-w-[5.5rem] shrink-0 flex-1 border-r border-[#333] px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--trade-muted)]">
              MCAP
            </p>
            <p className="trade-stat-value mt-0.5 font-mono text-sm font-bold tabular-nums text-[var(--tensor-white)]/90">
              {formatSolStat(marketCapSol)}
            </p>
          </div>
          <div className="trade-stat-cell min-w-[6.5rem] shrink-0 flex-[1.2] px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--trade-muted)]">
              LISTED/SUPPLY
            </p>
            <p className="trade-stat-value mt-0.5 font-mono text-sm font-bold tabular-nums text-[var(--tensor-white)]/90">
              {formatListedSupply(listedCount, listedPct)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
