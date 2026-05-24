"use client";

import Link from "next/link";
import { useState } from "react";
import type { SiteConfig } from "@/types/content";
import { CopyAddressButton } from "@/components/copy-address-button";
import { FooterDisclaimer } from "@/components/footer-disclaimer";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { LAUNCH_APP_HREF } from "@/lib/brand";
import { TRADE_ROUTES } from "@/lib/trade-routes";
import { VAULT_ROUTES } from "@/lib/vault-routes";

type Props = {
  site: SiteConfig;
};

const footerLinkRing =
  "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-vault-deep";

const footerMutedLinkClass = `${footerLinkRing} text-muted transition-colors hover:text-foreground`;

const footerAccentLinkClass = `${footerLinkRing} text-vault-amber underline-offset-4 transition-colors hover:underline`;

function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function SiteFooter({ site }: Props) {
  const { contractAddress, links, treasurySquadsUrl, vaultAddresses } = site;
  const [showFullAddress, setShowFullAddress] = useState(false);

  return (
    <footer className="border-t border-line bg-vault-deep/85 transition-all duration-300">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-5 sm:py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-3">
            <p className="font-display text-base font-semibold text-foreground transition-colors hover:text-vault-amber">{site.brandName}</p>
            <p className="text-sm leading-relaxed text-muted">{site.tagline}</p>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Contract</p>
            <div className="space-y-2">
              <p className="break-all font-mono text-xs text-muted">
                {showFullAddress ? contractAddress : truncateAddress(contractAddress)}
              </p>
              <div className="flex gap-2">
                <CopyAddressButton address={contractAddress} />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 py-1 text-xs transition-all duration-300 hover:scale-105"
                  onClick={() => setShowFullAddress(!showFullAddress)}
                  aria-pressed={showFullAddress}
                >
                  {showFullAddress ? "Show less" : "Show full"}
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Treasury</p>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <span className="text-foreground/80">Vault SNS: </span>
                <span className="font-mono text-xs">{vaultAddresses.snsTreasury}</span>
              </li>
              <li>
                <span className="text-foreground/80">Deployer SNS: </span>
                <span className="font-mono text-xs">{vaultAddresses.snsDeployer}</span>
              </li>
              <li>
                <Link
                  href={treasurySquadsUrl}
                  className={footerAccentLinkClass}
                  target="_blank"
                  rel="noreferrer"
                >
                  Squads multisig
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="bg-line/80" />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Platform</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <Link className={footerMutedLinkClass} href="/">
                Home
              </Link>
              <Link className={footerMutedLinkClass} href={VAULT_ROUTES.overview}>
                Vault
              </Link>
              <Link className={footerMutedLinkClass} href={LAUNCH_APP_HREF}>
                GRAILS
              </Link>
              <Link className={footerMutedLinkClass} href={TRADE_ROUTES.all}>
                All listings
              </Link>
              <Link className={footerMutedLinkClass} href="/pulls">
                Pulls
              </Link>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Market links</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <Link className={footerMutedLinkClass} href={links.pump} target="_blank" rel="noreferrer">
                Pump.fun
              </Link>
              <Link className={footerMutedLinkClass} href={links.dexscreener} target="_blank" rel="noreferrer">
                Dexscreener
              </Link>
              <Link className={footerMutedLinkClass} href={links.birdeye} target="_blank" rel="noreferrer">
                Birdeye
              </Link>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Official channels</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <Link className={footerMutedLinkClass} href={links.twitter} target="_blank" rel="noreferrer">
                X
              </Link>
              <Link className={footerMutedLinkClass} href={links.telegram} target="_blank" rel="noreferrer">
                Telegram
              </Link>
              <Link className={footerMutedLinkClass} href={links.discord} target="_blank" rel="noreferrer">
                Discord
              </Link>
              <Link className={footerMutedLinkClass} href={links.linktree} target="_blank" rel="noreferrer">
                Linktree
              </Link>
              <Link className={footerMutedLinkClass} href={links.gitbook} target="_blank" rel="noreferrer">
                GitBook
              </Link>
            </div>
          </div>
        </div>

        <Separator className="bg-line/80" />

        <FooterDisclaimer />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted/80">Built in public.</p>
        </div>
      </div>
    </footer>
  );
}
