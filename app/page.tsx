import type { Metadata } from "next";

import { LinkButton } from "@/components/link-button";
import { QuickLinks } from "@/components/quick-links";
import { StatStrip } from "@/components/stat-strip";
import { StreamEmbed } from "@/components/stream-embed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDexTokenStats } from "@/lib/dexscreener";
import { getSiteConfig } from "@/lib/site-config";

export default async function Home() {
  const site = getSiteConfig();
  const stats = await getDexTokenStats(site.contractAddress);

  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 py-14 sm:space-y-16 sm:px-5 sm:py-16">
      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6 sm:space-y-7">
          <Badge
            variant="secondary"
            className="inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-vault-mint" />
            Transparent multisig vault · Solana
          </Badge>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
            The collectible vault,{" "}
            <span className="text-vault-amber">owned by the community.</span>
          </h1>
          <p className="max-w-prose text-lg leading-relaxed text-muted">
            {site.description}
          </p>
          <div className="flex flex-wrap gap-3">
            <LinkButton href={site.links.pump} external>
              Buy on Pump.fun
            </LinkButton>
            <LinkButton href={site.links.gitbook} external variant="secondary">
              Read GitBook
            </LinkButton>
            <LinkButton href={site.links.twitter} external variant="secondary">
              Follow on X
            </LinkButton>
            <LinkButton href={site.treasurySquadsUrl} external variant="secondary">
              View Squads treasury
            </LinkButton>
            <LinkButton href="/vault" variant="ghost">
              Explore the vault
            </LinkButton>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-5">
          <Card className="space-y-3 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Latest pull
            </p>
            <p className="font-display text-xl font-semibold text-foreground">
              {site.latestPull.title}
            </p>
            <p className="text-sm text-muted">
              {site.latestPull.date} · {site.latestPull.source}
            </p>
            <p className="text-sm leading-relaxed text-muted">
              {site.latestPull.detail}
            </p>
            {site.latestPull.clipUrl ? (
              <Button asChild variant="link" size="sm" className="h-auto min-h-0 justify-start p-0">
                <a href={site.latestPull.clipUrl} target="_blank" rel="noreferrer">
                  Watch clip
                </a>
              </Button>
            ) : null}
          </Card>

          <Card className="space-y-3 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Latest slab
            </p>
            {site.latestSlab.imageUrl?.trim() ? (
              <div className="overflow-hidden rounded-xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element -- remote URL from site.json */}
                <img
                  src={site.latestSlab.imageUrl.trim()}
                  alt={`${site.latestSlab.name} ${site.latestSlab.grade}`}
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : null}
            <p className="font-display text-xl font-semibold text-foreground">
              {site.latestSlab.name}{" "}
              <span className="text-vault-amber">· {site.latestSlab.grade}</span>
            </p>
            <p className="text-sm leading-relaxed text-muted">
              {site.latestSlab.note}
            </p>
          </Card>
        </div>
      </section>

      <QuickLinks links={site.links} />

      <StatStrip
        stats={stats}
        dexscreenerUrl={site.links.dexscreener}
        birdeyeUrl={site.links.birdeye}
        manualVaultValueUsd={site.manualVaultValueUsd}
      />

      <StreamEmbed
        live={site.stream.live}
        embedUrl={site.stream.embedUrl}
        watchUrl={site.stream.watchUrl}
      />

      <Card className="border-line bg-gradient-to-br from-vault-panel/80 to-vault-deep/60 p-6 sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold">Proof of reserves</h2>
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
