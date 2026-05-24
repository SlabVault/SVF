import { GachaTiers } from "@/components/gacha-tiers";
import { VaultHowItWorks } from "@/components/vault-how-it-works";
import { LinkButton } from "@/components/link-button";
import { LivePullBoard } from "@/components/live-pull-board";
import { StreamEmbed } from "@/components/stream-embed";
import { RecentPullsCarousel } from "@/components/recent-pulls-carousel";
import { SlabCard } from "@/components/slab-card";
import { VaultFlywheel } from "@/components/vault-flywheel";
import { VaultStatsStrip } from "@/components/vault-stats-strip";
import { VaultTreasuryTeaser } from "@/components/vault-treasury-teaser";
import { normalizeSlabImageSrc } from "@/lib/slab-image-url";
import { summarizeVault } from "@/lib/vault-stats";
import type { PullItem, SiteConfig, SlabItem } from "@/types/content";

type Props = {
  site: SiteConfig;
  slabs: SlabItem[];
  pulls: PullItem[];
};

export function VaultOverview({ site, slabs, pulls }: Props) {
  const featuredSlabs = slabs
    .filter((slab) => normalizeSlabImageSrc(slab.imageUrl))
    .slice(0, 4);
  const recentPulls = pulls.slice(0, 6);
  const vaultSummary = summarizeVault(slabs, site.manualVaultValueUsd);

  return (
    <div className="space-y-14 pb-10 sm:space-y-16">
      <LivePullBoard livePull={site.livePull} stream={site.stream} />

      {site.stream.live || site.stream.embedUrl ? (
        <StreamEmbed
          live={site.stream.live}
          embedUrl={site.stream.embedUrl}
          watchUrl={site.stream.watchUrl}
        />
      ) : null}

      <VaultFlywheel />

      <VaultStatsStrip summary={vaultSummary} />

      <VaultTreasuryTeaser />

      <div id="pull-tiers">
        <GachaTiers site={site} trackingContext="vault_overview" />
      </div>

      <section className="space-y-6" aria-labelledby="vault-featured-slabs-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="vault-featured-slabs-heading"
              className="font-heading text-2xl font-bold tracking-tight sm:text-3xl"
            >
              Featured slabs
            </h2>
            <p className="mt-1 max-w-prose text-sm text-muted">
              Highlights from the multisig inventory — full catalog below.
            </p>
          </div>
          <LinkButton
            href="/trade"
            variant="ghost"
            trackingEvent="cta_buy_vault_slabs_on_trade"
            trackingContext="vault_featured_slabs"
          >
            Trade vault slabs →
          </LinkButton>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featuredSlabs.map((slab) => (
            <SlabCard key={slab.id} slab={slab} />
          ))}
        </div>
      </section>

      <RecentPullsCarousel pulls={recentPulls} compact trackingContext="vault_overview" />

      <VaultHowItWorks />
    </div>
  );
}
