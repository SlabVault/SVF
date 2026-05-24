import Link from "next/link";

import { Button } from "@/components/ui/button";
import { GRAILS_BRAND } from "@/lib/brand";
import { TRADE_ROUTES } from "@/lib/trade-routes";
import { cn } from "@/lib/utils";
import { VAULT_ROUTES } from "@/lib/vault-routes";

type Props = {
  exploreHref?: string | null;
  allListingsHref?: string | null;
  className?: string;
};

/** GRAILS desk hero — Tensor-for-graded-cards value prop + primary explore CTA. */
export function TradeLandingValueHero({
  exploreHref = TRADE_ROUTES.collectionsIndex,
  allListingsHref = TRADE_ROUTES.all,
  className,
}: Props) {
  const indexHref = exploreHref ?? TRADE_ROUTES.collectionsIndex;
  const aggregateHref = allListingsHref ?? TRADE_ROUTES.all;

  return (
    <section
      className={cn("trade-landing-value-hero mb-3", className)}
      aria-labelledby="trade-landing-value-heading"
    >
      <div className="trade-landing-value-hero__panel overflow-hidden rounded border border-[#333] bg-[var(--trade-surface)]">
        <div className="trade-landing-value-hero__inner flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--tensor-accent)]">
              {GRAILS_BRAND.name} · {GRAILS_BRAND.subtitle}
            </p>
            <h1
              id="trade-landing-value-heading"
              className="mt-1.5 text-xl font-bold leading-tight text-[var(--tensor-white)] sm:text-2xl"
            >
              Tensor for graded cards
            </h1>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-[var(--trade-muted)] sm:text-[13px]">
              {GRAILS_BRAND.description}
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Button
              asChild
              className="tensor-btn-primary h-9 w-full px-5 text-[11px] font-bold uppercase tracking-wide sm:w-auto"
            >
              <Link
                href={aggregateHref}
                data-growth-event="cta_trade_landing_all_listings"
                data-growth-context="trade_landing_value_hero"
              >
                Browse all listings
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="h-9 w-full border-[#333] bg-[var(--trade-panel)] px-5 text-[11px] font-bold uppercase tracking-wide text-[var(--tensor-white)] hover:bg-[var(--trade-surface)] sm:w-auto"
            >
              <Link
                href={indexHref}
                data-growth-event="cta_trade_landing_explore"
                data-growth-context="trade_landing_value_hero"
              >
                Collection index
              </Link>
            </Button>
            <p className="text-center text-[10px] text-[var(--trade-muted)] sm:text-right">
              Merged CC · Phygitals · treasury rows on one desk ·{" "}
              <Link
                href={VAULT_ROUTES.overview}
                className="text-[var(--tensor-white)] underline-offset-2 transition-colors hover:underline"
                data-growth-event="cta_explore_vault"
                data-growth-context="trade_landing_value_hero"
              >
                View community vault
              </Link>
            </p>
          </div>
        </div>
        <div
          className="trade-landing-value-hero__accent h-0.5 w-full bg-gradient-to-r from-[var(--tensor-accent)] via-emerald-500/60 to-transparent"
          aria-hidden
        />
      </div>
    </section>
  );
}
