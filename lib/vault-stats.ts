import type { PullItem, SlabItem } from "@/types/content";

export type VaultSummary = {
  slabCount: number;
  totalValueUsd: number | null;
  lastAcquiredAt: string | null;
  valuedSlabCount: number;
};

export function summarizeVault(
  slabs: SlabItem[],
  manualVaultValueUsd: number | null,
): VaultSummary {
  let valueSum = 0;
  let valueCount = 0;
  let lastAcquired: string | null = null;

  for (const slab of slabs) {
    if (
      slab.estimatedValueUsd != null &&
      Number.isFinite(slab.estimatedValueUsd)
    ) {
      valueSum += slab.estimatedValueUsd;
      valueCount += 1;
    }
    if (slab.acquiredAt && (!lastAcquired || slab.acquiredAt > lastAcquired)) {
      lastAcquired = slab.acquiredAt;
    }
  }

  const computedTotal = valueCount > 0 ? valueSum : null;
  const totalValueUsd =
    manualVaultValueUsd != null && Number.isFinite(manualVaultValueUsd)
      ? manualVaultValueUsd
      : computedTotal;

  return {
    slabCount: slabs.length,
    totalValueUsd,
    lastAcquiredAt: lastAcquired,
    valuedSlabCount: valueCount,
  };
}

export type GrailItem = {
  id: string;
  kind: "pull" | "slab";
  name: string;
  grade: string;
  valueUsd: number;
  imageUrl: string;
  clipUrl: string;
  date: string;
};

export function getGrailItems(
  pulls: PullItem[],
  slabs: SlabItem[],
  limit = 8,
): GrailItem[] {
  const items: GrailItem[] = [];

  for (const pull of pulls) {
    if (pull.outcomeUsd == null || !Number.isFinite(pull.outcomeUsd)) continue;
    items.push({
      id: `pull-${pull.id}`,
      kind: "pull",
      name: pull.summary.trim() || pull.source,
      grade: pull.source,
      valueUsd: pull.outcomeUsd,
      imageUrl: "",
      clipUrl: pull.clipUrl?.trim() ?? "",
      date: pull.date,
    });
  }

  for (const slab of slabs) {
    if (
      slab.estimatedValueUsd == null ||
      !Number.isFinite(slab.estimatedValueUsd)
    ) {
      continue;
    }
    items.push({
      id: `slab-${slab.id}`,
      kind: "slab",
      name: slab.name,
      grade: slab.grade,
      valueUsd: slab.estimatedValueUsd,
      imageUrl: slab.imageUrl?.trim() ?? "",
      clipUrl: slab.vaultedUrl?.trim() ?? "",
      date: slab.acquiredAt,
    });
  }

  return items
    .sort((a, b) => b.valueUsd - a.valueUsd)
    .slice(0, limit);
}
