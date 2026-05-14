import type { Metadata } from "next";
import { LinkButton } from "@/components/link-button";
import { StatStrip } from "@/components/stat-strip";
import { StreamEmbed } from "@/components/stream-embed";
import { getDexTokenStats } from "@/lib/dexscreener";
import { getSiteConfig } from "@/lib/site-config";

export default async function Home() {
  const site = getSiteConfig();
  const stats = await getDexTokenStats(site.contractAddress);

  return (
    <div className="mx-auto max-w-6xl space-y-16 px-4 py-14">
      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-vault-panel px-3 py-1 text-xs font-semibold text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-vault-mint" />
            Transparent multisig vault · Solana
          </p>
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
            <LinkButton href={site.treasurySquadsUrl} external variant="secondary">
              View Squads treasury
            </LinkButton>
            <LinkButton href="/vault" variant="ghost">
              Explore the vault
            </LinkButton>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-line bg-vault-panel/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Latest pull
            </p>
            <p className="mt-2 font-display text-xl font-semibold text-foreground">
              {site.latestPull.title}
            </p>
            <p className="mt-1 text-sm text-muted">
              {site.latestPull.date} · {site.latestPull.source}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {site.latestPull.detail}
            </p>
            {site.latestPull.clipUrl ? (
              <a
                href={site.latestPull.clipUrl}
                className="mt-4 inline-flex text-sm font-semibold text-vault-amber underline-offset-4 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Watch clip
              </a>
            ) : null}
          </div>

          <div className="rounded-2xl border border-line bg-vault-panel/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Latest slab
            </p>
            <p className="mt-2 font-display text-xl font-semibold text-foreground">
              {site.latestSlab.name}{" "}
              <span className="text-vault-amber">· {site.latestSlab.grade}</span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {site.latestSlab.note}
            </p>
          </div>
        </div>
      </section>

      <StatStrip
        stats={stats}
        dexscreenerUrl={site.links.dexscreener}
        manualVaultValueUsd={site.manualVaultValueUsd}
      />

      <StreamEmbed
        live={site.stream.live}
        embedUrl={site.stream.embedUrl}
        watchUrl={site.stream.watchUrl}
      />

      <section className="rounded-2xl border border-line bg-gradient-to-br from-vault-panel/80 to-vault-deep/60 p-6 sm:p-8">
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
      </section>
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
