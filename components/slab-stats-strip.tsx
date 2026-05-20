import type { SlabItem } from "@/types/content";
import { Card } from "@/components/ui/card";
import { formatUsd } from "@/lib/format";

type Props = {
  slabs: SlabItem[];
};

export function SlabStatsStrip({ slabs }: Props) {
  const withImage = slabs.filter((s) => s.imageUrl?.trim()).length;
  let valueSum = 0;
  let valueCount = 0;
  for (const s of slabs) {
    if (s.estimatedValueUsd != null && Number.isFinite(s.estimatedValueUsd)) {
      valueSum += s.estimatedValueUsd;
      valueCount += 1;
    }
  }
  const totalValue = valueCount ? formatUsd(valueSum) : "—";
  const valueNote =
    slabs.length === 0
      ? "Add slabs in data/slabs.json"
      : `${valueCount}/${slabs.length} slabs include an estimate`;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card variant="stat" className="group p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-vault-violet/20 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
        <p className="text-xs font-medium uppercase tracking-wide text-muted group-hover:text-vault-amber transition-colors duration-300">
          Slabs listed
        </p>
        <p className="mt-2 font-mono text-3xl font-semibold text-foreground group-hover:text-vault-amber transition-colors duration-300">{slabs.length}</p>
      </Card>
      <Card variant="stat" className="group p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-vault-violet/20 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
        <p className="text-xs font-medium uppercase tracking-wide text-muted group-hover:text-vault-amber transition-colors duration-300">
          With images
        </p>
        <p className="mt-2 font-mono text-3xl font-semibold text-foreground group-hover:text-vault-amber transition-colors duration-300">{withImage}</p>
      </Card>
      <Card variant="stat" className="group p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-vault-violet/20 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
        <p className="text-xs font-medium uppercase tracking-wide text-muted group-hover:text-vault-amber transition-colors duration-300">
          Est. value tracked (USD)
        </p>
        <p className="mt-2 font-mono text-3xl font-semibold text-foreground group-hover:text-vault-amber transition-colors duration-300">{totalValue}</p>
        <p className="mt-1 text-xs text-muted">{valueNote}</p>
      </Card>
    </div>
  );
}
