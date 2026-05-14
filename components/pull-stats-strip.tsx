import type { PullStats } from "@/lib/pull-stats";
import { Card } from "@/components/ui/card";
import { formatUsd } from "@/lib/format";

type Props = {
  stats: PullStats;
};

export function PullStatsStrip({ stats }: Props) {
  const cost = stats.costSum != null ? formatUsd(stats.costSum) : "—";
  const outcome =
    stats.outcomeSum != null ? formatUsd(stats.outcomeSum) : "—";
  const costCoverage =
    stats.count === 0
      ? "Add pulls in data/pulls.json"
      : `${stats.costCount}/${stats.count} pulls include cost`;
  const outcomeCoverage = `${stats.outcomeCount}/${stats.count} pulls include outcome`;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card variant="stat" className="p-4 transition-[border-color] hover:border-vault-violet/30">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Pulls logged
        </p>
        <p className="mt-2 font-mono text-2xl font-semibold">{stats.count}</p>
      </Card>
      <Card variant="stat" className="p-4 transition-[border-color] hover:border-vault-violet/30">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Clips linked
        </p>
        <p className="mt-2 font-mono text-2xl font-semibold">{stats.withClip}</p>
      </Card>
      <Card variant="stat" className="p-4 transition-[border-color] hover:border-vault-violet/30">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Tracked spend (USD)
        </p>
        <p className="mt-2 font-mono text-2xl font-semibold">{cost}</p>
        <p className="mt-1 text-xs text-muted">{costCoverage}</p>
      </Card>
      <Card variant="stat" className="p-4 transition-[border-color] hover:border-vault-violet/30">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Tracked outcomes (USD)
        </p>
        <p className="mt-2 font-mono text-2xl font-semibold">{outcome}</p>
        <p className="mt-1 text-xs text-muted">{outcomeCoverage}</p>
      </Card>
    </div>
  );
}
