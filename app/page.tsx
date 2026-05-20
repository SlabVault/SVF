import type { Metadata } from "next";

import { GachaTiers } from "@/components/gacha-tiers";
import { HeroSection } from "@/components/hero-section";
import { HowItWorks } from "@/components/how-it-works";
import { LinkButton } from "@/components/link-button";
import { QuickLinks } from "@/components/quick-links";
import { RecentPullsCarousel } from "@/components/recent-pulls-carousel";
import { StatStrip } from "@/components/stat-strip";
import { StreamEmbed } from "@/components/stream-embed";
import { SlabCard } from "@/components/slab-card";
import { WalletBalances } from "@/components/wallet-balances";
import { Card } from "@/components/ui/card";
import { getDexTokenStats } from "@/lib/dexscreener";
import { getPulls, getSiteConfig, getSlabs } from "@/lib/site-config";

export default async function Home() {
  const site = getSiteConfig();
  const stats = await getDexTokenStats(site.contractAddress);
  const slabs = getSlabs();
  const pulls = getPulls();
  const featuredSlabs = slabs.slice(0, 3);
  const recentPulls = pulls.slice(0, 8);

  return (
    <>
      <HeroSection site={site} slabs={slabs} />

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-14 sm:space-y-20 sm:px-5 sm:py-16">
        <GachaTiers site={site} />

        <section className="space-y-6 motion-safe:animate-fade-in-up">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Featured slabs
            </h2>
            <LinkButton href="/marketplace" variant="ghost">
              View all →
            </LinkButton>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredSlabs.map((slab) => (
              <SlabCard key={slab.id} slab={slab} />
            ))}
          </div>
        </section>

        <RecentPullsCarousel pulls={recentPulls} />

        <WalletBalances site={site} />

        <StreamEmbed
          live={site.stream.live}
          embedUrl={site.stream.embedUrl}
          watchUrl={site.stream.watchUrl}
        />

        <QuickLinks links={site.links} />

        <section className="space-y-4">
          <h2 className="font-heading text-xl font-semibold text-muted">Market snapshot</h2>
          <StatStrip
            stats={stats}
            dexscreenerUrl={site.links.dexscreener}
            birdeyeUrl={site.links.birdeye}
            manualVaultValueUsd={site.manualVaultValueUsd}
          />
        </section>

        <HowItWorks />

        <Card className="border-line bg-gradient-to-br from-vault-panel/80 to-vault-deep/60 p-6 transition-[border-color,box-shadow] hover:border-vault-violet/25 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold">Proof of reserves</h2>
              <p className="mt-2 max-w-prose text-sm text-muted">
                Track the physical collection on Vaulted and Collectr, and follow
                on-chain treasury movements via Squads.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <LinkButton href={site.links.vaulted} external variant="secondary">
                Vaulted profile
              </LinkButton>
              <LinkButton href={site.links.collectr} external variant="secondary">
                Collectr showcase
              </LinkButton>
              <LinkButton
                href={site.links.collectorCryptTreasury}
                external
                variant="secondary"
              >
                Collector Crypt
              </LinkButton>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

export const metadata: Metadata = {
  title: "Home",
  description:
    "SlabVaultFi: live gacha pulls, graded Pokémon slabs, and a transparent multisig vault on Solana.",
  openGraph: {
    title: "SlabVaultFi — Community-owned collectible vault",
    description:
      "Live gacha pulls, graded Pokémon slabs, and a transparent multisig vault.",
    url: "/",
  },
};
