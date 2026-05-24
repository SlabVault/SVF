import { Card } from "@/components/ui/card";
import { getTradeLandingStats } from "@/lib/trade-landing";

export function AggregatorStatsStrip() {
  const stats = getTradeLandingStats();

  return (
    <section className="space-y-4" aria-labelledby="aggregator-stats-heading">
      <div>
        <h2
          id="aggregator-stats-heading"
          className="font-heading text-2xl font-bold tracking-tight sm:text-3xl"
        >
          Aggregator at a glance
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted">
          Unified desk for graded-card liquidity across partner marketplaces on Solana.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card
          variant="stat"
          className="p-6 bg-gradient-to-br from-vault-panel/60 to-vault-deep/50"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Liquidity venues
          </p>
          <p className="mt-2 font-display text-4xl font-semibold text-foreground sm:text-5xl">
            {stats.venueCount}
          </p>
          <p className="mt-1 text-xs text-muted">CC · Phygitals · Magic Eden</p>
        </Card>
        <Card
          variant="stat"
          className="p-6 bg-gradient-to-br from-vault-amber/10 to-vault-deep/50"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Collections indexed
          </p>
          <p className="mt-2 font-display text-4xl font-semibold text-vault-amber sm:text-5xl">
            {stats.collectionCount}
          </p>
          <p className="mt-1 text-xs text-muted">Graded-card registry on /trade</p>
        </Card>
        <Card
          variant="stat"
          className="p-6 bg-gradient-to-br from-vault-panel/60 to-vault-deep/50"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Listing data
          </p>
          <p className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl">
            {stats.listingDataLabel}
          </p>
          <p className="mt-1 text-xs text-muted">
            {stats.listingDataReady
              ? "CC scraper + Phygitals ingest; Tensor API optional"
              : "Run sync:discover or set HELIUS_API_KEY for cert↔mint"}
          </p>
        </Card>
      </div>
    </section>
  );
}
