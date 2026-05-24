import { getSolanaRpcUrl } from "@/lib/marketplace-config";

type PerformanceSample = {
  numTransactions?: unknown;
  samplePeriodSecs?: unknown;
};

/** Latest Solana TPS from `getRecentPerformanceSamples` — null when RPC unavailable. */
export async function fetchSolanaTps(rpcUrl?: string): Promise<number | null> {
  const url = rpcUrl?.trim() || getSolanaRpcUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getRecentPerformanceSamples",
        params: [1],
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const json = (await res.json()) as {
      result?: PerformanceSample[];
      error?: unknown;
    };
    if (json.error) return null;

    const sample = json.result?.[0];
    const txs = sample?.numTransactions;
    const period = sample?.samplePeriodSecs;
    if (
      typeof txs !== "number" ||
      typeof period !== "number" ||
      !Number.isFinite(txs) ||
      !Number.isFinite(period) ||
      txs <= 0 ||
      period <= 0
    ) {
      return null;
    }

    const tps = txs / period;
    return Number.isFinite(tps) && tps > 0 ? tps : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Footer label — Tensor-style approximate TPS or em dash when unknown. */
export function formatSolanaTpsLabel(tps: number | null | undefined): string {
  if (tps == null || !Number.isFinite(tps) || tps <= 0) return "—";

  const rounded =
    tps >= 1000
      ? Math.round(tps / 100) * 100
      : tps >= 100
        ? Math.round(tps / 10) * 10
        : Math.round(tps);

  return `~${rounded.toLocaleString("en-US")}`;
}
