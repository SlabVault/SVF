import Link from "next/link";
import type { SiteConfig } from "@/types/content";
import { CopyAddressButton } from "@/components/copy-address-button";
import { Disclaimer } from "@/components/disclaimer";

type Props = {
  site: SiteConfig;
};

export function SiteFooter({ site }: Props) {
  const { contractAddress, links, treasurySquadsUrl, vaultAddresses } = site;

  return (
    <footer className="border-t border-line bg-vault-deep/80">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-12">
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
                  className="text-vault-amber underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Squads multisig
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
          <Link className="hover:text-foreground" href={links.gitbook} target="_blank" rel="noreferrer">
            GitBook
          </Link>
          <Link className="hover:text-foreground" href={links.dexscreener} target="_blank" rel="noreferrer">
            Dexscreener
          </Link>
          <Link className="hover:text-foreground" href={links.birdeye} target="_blank" rel="noreferrer">
            Birdeye
          </Link>
          <Link className="hover:text-foreground" href={links.twitter} target="_blank" rel="noreferrer">
            X
          </Link>
          <Link className="hover:text-foreground" href={links.telegram} target="_blank" rel="noreferrer">
            Telegram
          </Link>
        </div>

        <Disclaimer />

        <p className="text-xs text-muted/80">Built in public.</p>
      </div>
    </footer>
  );
}
