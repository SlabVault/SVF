import { Card } from "@/components/ui/card";
import { formatUsd } from "@/lib/format";
import type { VaultSummary } from "@/lib/vault-stats";

type Props = {
  summary: VaultSummary;
  /** Hide section heading when nested inside a parent section (e.g. home live pulse). */
  embedded?: boolean;
};

export function VaultStatsStrip({ summary, embedded = false }: Props) {
  const total =
    summary.totalValueUsd != null
      ? formatUsd(summary.totalValueUsd)
      : "—";
  const lastAcquired = summary.lastAcquiredAt
    ? new Date(summary.lastAcquiredAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <section className="space-y-4" aria-labelledby={embedded ? undefined : "vault-stats-heading"}>
      {embedded ? null : (
        <div>
          <h2
            id="vault-stats-heading"
            className="font-heading text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Vault at a glance
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted">
            Aggregated from the on-site slab ledger. Manual override applies when set
            in site.json.
          </p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card
          variant="stat"
          className="p-6 bg-gradient-to-br from-vault-panel/60 to-vault-deep/50"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Slabs in vault
          </p>
          <p className="mt-2 font-display text-4xl font-semibold text-foreground sm:text-5xl">
            {summary.slabCount}
          </p>
        </Card>
        <Card
          variant="stat"
          className="p-6 bg-gradient-to-br from-vault-amber/10 to-vault-deep/50"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Est. vault value (USD)
          </p>
          <p className="mt-2 font-display text-4xl font-semibold text-vault-amber sm:text-5xl">
            {total}
          </p>
          {summary.valuedSlabCount > 0 ? (
            <p className="mt-1 text-xs text-muted">
              {summary.valuedSlabCount} slab
              {summary.valuedSlabCount === 1 ? "" : "s"} with FMV
            </p>
          ) : null}
        </Card>
        <Card
          variant="stat"
          className="p-6 bg-gradient-to-br from-vault-panel/60 to-vault-deep/50"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Last acquired
          </p>
          <p className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl">
            {lastAcquired}
          </p>
        </Card>
      </div>
    </section>
  );
}
