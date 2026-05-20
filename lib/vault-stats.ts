import type { SlabItem } from "@/types/content";

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
