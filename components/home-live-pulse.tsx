import Link from "next/link";

import { RecentPullsCarousel } from "@/components/recent-pulls-carousel";
import { VaultStatsStrip } from "@/components/vault-stats-strip";
import { SECTION_STACK_CLASS } from "@/lib/layout";
import { summarizeVault } from "@/lib/vault-stats";
import type { PullItem, SiteConfig, SlabItem } from "@/types/content";

type Props = {
  site: SiteConfig;
  slabs: SlabItem[];
  pulls: PullItem[];
};

export function HomeLivePulse({ site, slabs, pulls }: Props) {
  const vaultSummary = summarizeVault(slabs, site.manualVaultValueUsd);
  const recentPulls = pulls.slice(0, 8);

  return (
    <section
      className={SECTION_STACK_CLASS}
      aria-labelledby="home-live-pulse-heading"
    >
      <div className="max-w-2xl">
        <h2 id="home-live-pulse-heading" className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          Live pulse
        </h2>
        <p className="mt-2 max-w-prose text-sm text-muted sm:text-base">
          Real inventory and pull history from the on-site ledger — no synthetic
          metrics. Treasury balances sync from{" "}
          {site.lastSyncAt
            ? new Date(site.lastSyncAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "site data"}
          .
        </p>
      </div>

      <VaultStatsStrip summary={vaultSummary} embedded />

      {recentPulls.length > 0 ? (
        <RecentPullsCarousel
          pulls={recentPulls}
          trackingContext="home_recent_pulls"
        />
      ) : (
        <div className="rounded-xl border border-dashed border-line/80 bg-vault-deep/40 px-5 py-8 text-center sm:px-8">
          <p className="font-heading text-lg font-semibold text-foreground">
            Pull history coming soon
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Recent gacha pulls will appear here as they are logged. Follow live
            updates on X and Telegram in the meantime.
          </p>
          <Link
            href="/pulls"
            className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-vault-amber underline-offset-4 hover:underline"
            data-growth-event="cta_view_all_pulls"
            data-growth-context="home_recent_pulls_empty"
          >
            Pulls page →
          </Link>
        </div>
      )}
    </section>
  );
}
