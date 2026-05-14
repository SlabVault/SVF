import Link from "next/link";
import type { DexTokenStats } from "@/lib/dexscreener";
import { formatUsd } from "@/lib/format";

type Props = {
  stats: DexTokenStats | null;
  dexscreenerUrl: string;
  birdeyeUrl: string;
  manualVaultValueUsd: number | null;
};

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-vault-panel/70 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-2 font-mono text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function StatStrip({
  stats,
  dexscreenerUrl,
  birdeyeUrl,
  manualVaultValueUsd,
}: Props) {
  const price = stats?.priceUsd != null ? formatUsd(stats.priceUsd) : "—";
  const liq = stats?.liquidityUsd != null ? formatUsd(stats.liquidityUsd) : "—";
  const vol = stats?.volume24hUsd != null ? formatUsd(stats.volume24hUsd) : "—";
  const fdv = stats?.fdvUsd != null ? formatUsd(stats.fdvUsd) : "—";
  const vault =
    manualVaultValueUsd != null ? formatUsd(manualVaultValueUsd) : null;
  const pairHref = stats?.pairUrl ?? dexscreenerUrl;

  return (
    <section className="space-y-3" aria-label="Market snapshot">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            Live snapshot
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted">
            Indicative values from Dexscreener (cached a few minutes). Verify on
            Dexscreener or Birdeye before trading.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm font-semibold">
          <Link
            href={pairHref}
            className="text-vault-amber underline-offset-4 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Dexscreener
          </Link>
          <Link
            href={birdeyeUrl}
            className="text-vault-amber underline-offset-4 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Birdeye
          </Link>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="$SVF price (USD)" value={price} />
        <Stat label="Pair liquidity (USD)" value={liq} />
        <Stat label="24h volume (USD)" value={vol} />
        <Stat label="FDV (USD, est.)" value={fdv} />
        <Stat label="Manual vault estimate (USD)" value={vault ?? "—"} />
      </div>
    </section>
  );
}
