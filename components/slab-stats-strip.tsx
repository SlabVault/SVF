import type { SlabItem } from "@/types/content";
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
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-line bg-vault-panel/60 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Slabs listed
        </p>
        <p className="mt-2 font-mono text-2xl font-semibold">{slabs.length}</p>
      </div>
      <div className="rounded-xl border border-line bg-vault-panel/60 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          With images
        </p>
        <p className="mt-2 font-mono text-2xl font-semibold">{withImage}</p>
      </div>
      <div className="rounded-xl border border-line bg-vault-panel/60 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Est. value tracked (USD)
        </p>
        <p className="mt-2 font-mono text-2xl font-semibold">{totalValue}</p>
        <p className="mt-1 text-xs text-muted">{valueNote}</p>
      </div>
    </div>
  );
}
