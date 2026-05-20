import Link from "next/link";
import type { DexTokenStats } from "@/lib/dexscreener";
import { Card } from "@/components/ui/card";
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
    <Card variant="stat" className="group p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-vault-violet/20 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50 hover:border-vault-violet/30">
      <p className="text-xs font-medium uppercase tracking-wide text-muted group-hover:text-vault-amber transition-colors duration-300">
        {label}
      </p>
      <p className="mt-2 font-mono text-lg font-semibold text-foreground group-hover:text-vault-amber transition-colors duration-300">{value}</p>
    </Card>
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

  const outboundClass =
    "rounded-sm text-sm font-semibold text-vault-amber underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <section className="space-y-4" aria-label="Market snapshot">
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
        <div className="flex flex-wrap items-center gap-4">
          <Link href={pairHref} className={outboundClass} target="_blank" rel="noreferrer">
            Dexscreener
          </Link>
          <Link href={birdeyeUrl} className={outboundClass} target="_blank" rel="noreferrer">
            Birdeye
          </Link>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-5 sm:overflow-visible sm:pb-0">
        <Stat label="$SVF price (USD)" value={price} />
        <Stat label="Pair liquidity (USD)" value={liq} />
        <Stat label="24h volume (USD)" value={vol} />
        <Stat label="FDV (USD, est.)" value={fdv} />
        <Stat label="Manual vault estimate (USD)" value={vault ?? "—"} />
      </div>
    </section>
  );
}
