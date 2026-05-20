import type { Metadata } from "next";

import { Disclaimer } from "@/components/disclaimer";
import { LinkButton } from "@/components/link-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SocialShare } from "@/components/social-share";
import { getSiteConfig } from "@/lib/site-config";

const externalLinkClass =
  "font-semibold text-vault-amber underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm";

export default function CommunityPage() {
  const site = getSiteConfig();

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-14 sm:space-y-14 sm:px-5 sm:py-16">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Community", href: "/community" }]} />

      <header className="space-y-6 animate-fade-in-up">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-vault-amber animate-pulse-glow" />
              <h1 className="font-display text-4xl font-semibold tracking-tight">
                Community
              </h1>
            </div>
            <p className="max-w-prose text-muted">
              SlabVaultFi is coordinated in public: streams, pulls, and treasury proof.
              Always verify links before signing transactions or buying collectibles.
            </p>
          </div>
          <SocialShare url="/community" title="SlabVaultFi Community" description="Join the community and follow our roadmap" />
        </div>
        <div className="flex flex-wrap gap-3">
          <LinkButton href={site.links.twitter} external className="transition-all duration-300 hover:scale-105">
            Follow on X
          </LinkButton>
          <LinkButton href={site.links.telegram} external variant="secondary" className="transition-all duration-300 hover:scale-105">
            Join Telegram
          </LinkButton>
        </div>
        <p className="max-w-prose text-sm leading-relaxed text-muted">
          <span className="font-medium text-foreground">Discord invites rotate.</span>{" "}
          Use the official Linktree for the current server link, and never trust random DMs.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2 animate-slide-in">
        <Card className="group space-y-4 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-vault-violet/20 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
          <h2 className="font-display text-xl font-semibold group-hover:text-vault-amber transition-colors duration-300">Gacha partners</h2>
          <p className="text-sm text-muted">
            Referral links help the treasury run more pulls.
          </p>
          <ul className="space-y-3 text-sm">
            <li>
              <a
                className={externalLinkClass}
                href={site.links.gachaCollectorCrypt}
                target="_blank"
                rel="noreferrer"
              >
                Collector Crypt
              </a>
            </li>
            <li>
              <a
                className={externalLinkClass}
                href={site.links.gachaPhygitals}
                target="_blank"
                rel="noreferrer"
              >
                Phygitals
              </a>
            </li>
            <li>
              <a
                className={externalLinkClass}
                href={site.links.gachaBeezie}
                target="_blank"
                rel="noreferrer"
              >
                Beezie
              </a>
            </li>
          </ul>
        </Card>

        <Card className="group space-y-4 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-vault-violet/20 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
          <h2 className="font-display text-xl font-semibold group-hover:text-vault-amber transition-colors duration-300">Liquidity pools</h2>
          <p className="text-sm text-muted">Meteora DAMM v2 pools.</p>
          <ul className="space-y-3 text-sm">
            <li>
              <a
                className={externalLinkClass}
                href={site.links.poolSvfCards}
                target="_blank"
                rel="noreferrer"
              >
                SVF / CARDS
              </a>
            </li>
            <li>
              <a
                className={externalLinkClass}
                href={site.links.poolSvfPigeon}
                target="_blank"
                rel="noreferrer"
              >
                SVF / PIGEON
              </a>
            </li>
          </ul>
        </Card>
      </section>

      <Disclaimer />

      <Card variant="emphasis" className="group space-y-4 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-vault-violet/20 animate-fade-in-up">
        <h2 className="font-display text-xl font-semibold text-foreground group-hover:text-vault-amber transition-colors duration-300">
          Verify before you interact
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          Scams clone brands, contracts, and websites. Cross-check the contract
          address in the footer against official announcements, confirm Squads
          signers, and only use links from this site, GitBook, or the official X
          account.
        </p>
        <Button asChild variant="secondary" size="sm" className="w-fit transition-all duration-300 hover:scale-105">
          <a href={site.links.gitbook} target="_blank" rel="noreferrer">
            Open GitBook
          </a>
        </Button>
      </Card>
    </div>
  );
}

export const metadata: Metadata = {
  title: "Community",
  description: "SlabVaultFi socials, referrals, pools, and roadmap.",
  openGraph: {
    title: "Community — SlabVaultFi",
    description: "SlabVaultFi socials, referrals, pools, and roadmap.",
    url: "/community",
  },
};
