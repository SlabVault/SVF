import type { PullItem } from "@/types/content";

export type PullStats = {
  count: number;
  withClip: number;
  costSum: number | null;
  costCount: number;
  outcomeSum: number | null;
  outcomeCount: number;
};

export function summarizePulls(pulls: PullItem[]): PullStats {
  let withClip = 0;
  let costSum = 0;
  let costCount = 0;
  let outcomeSum = 0;
  let outcomeCount = 0;

  for (const p of pulls) {
    if (p.clipUrl?.trim()) withClip += 1;
    if (p.costUsd != null && Number.isFinite(p.costUsd)) {
      costSum += p.costUsd;
      costCount += 1;
    }
    if (p.outcomeUsd != null && Number.isFinite(p.outcomeUsd)) {
      outcomeSum += p.outcomeUsd;
      outcomeCount += 1;
    }
  }

  return {
    count: pulls.length,
    withClip,
    costSum: costCount ? costSum : null,
    costCount,
    outcomeSum: outcomeCount ? outcomeSum : null,
    outcomeCount,
  };
}
