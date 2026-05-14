import Link from "next/link";
import type { SiteConfig } from "@/types/content";
import { CopyAddressButton } from "@/components/copy-address-button";
import { Disclaimer } from "@/components/disclaimer";
import { Separator } from "@/components/ui/separator";

type Props = {
  site: SiteConfig;
};

const footerLinkRing =
  "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-vault-deep";

const footerMutedLinkClass = `${footerLinkRing} text-muted transition-colors hover:text-foreground`;

const footerAccentLinkClass = `${footerLinkRing} text-vault-amber underline-offset-4 transition-colors hover:underline`;

export function SiteFooter({ site }: Props) {
  const { contractAddress, links, treasurySquadsUrl, vaultAddresses } = site;

  return (
    <footer className="border-t border-line bg-vault-deep/85">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-5">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-3">
            <p className="font-display text-base font-semibold">{site.brandName}</p>
            <p className="text-sm leading-relaxed text-muted">{site.tagline}</p>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Contract</p>
            <p className="break-all font-mono text-xs text-muted">{contractAddress}</p>
            <CopyAddressButton address={contractAddress} />
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

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link className={footerMutedLinkClass} href={links.pump} target="_blank" rel="noreferrer">
            Pump.fun
          </Link>
          <Link className={footerMutedLinkClass} href={links.gitbook} target="_blank" rel="noreferrer">
            GitBook
          </Link>
          <Link className={footerMutedLinkClass} href={links.dexscreener} target="_blank" rel="noreferrer">
            Dexscreener
          </Link>
          <Link className={footerMutedLinkClass} href={links.birdeye} target="_blank" rel="noreferrer">
            Birdeye
          </Link>
          <Link className={footerMutedLinkClass} href={links.twitter} target="_blank" rel="noreferrer">
            X
          </Link>
          <Link className={footerMutedLinkClass} href={links.telegram} target="_blank" rel="noreferrer">
            Telegram
          </Link>
          <Link className={footerMutedLinkClass} href={links.linktree} target="_blank" rel="noreferrer">
            Linktree
          </Link>
        </div>

        <Disclaimer />

        <p className="text-xs text-muted/80">Built in public.</p>
      </div>
    </footer>
  );
}
