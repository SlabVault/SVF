import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { LinkButton } from "@/components/link-button";
import { CopyAddressButton } from "@/components/copy-address-button";
import { Card } from "@/components/ui/card";
import { getSiteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Proof of reserves",
  description:
    "On-chain Squads treasury, Collector Crypt accounts, Vollector, Vaulted, Collectr, and SNS addresses for SlabVaultFi.",
  openGraph: {
    title: "Proof of reserves — SlabVaultFi",
    url: "/vault/proof",
  },
};

export default function ProofOfReservesPage() {
  const site = getSiteConfig();
  const { links, vaultAddresses, collectorCryptAccounts, vollector } = site;

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-14 sm:px-5 sm:py-16">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Vault", href: "/vault" },
          { label: "Proof of reserves", href: "/vault/proof" },
        ]}
      />

      <header className="space-y-4">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Proof of reserves
        </h1>
        <p className="max-w-prose text-muted">
          Cross-check the physical collection and treasury movements using the
          links below. This page mirrors{" "}
          <code className="text-foreground">data/site.json</code> — update URLs
          there when accounts change.
        </p>
      </header>

      <Card className="space-y-4 p-6">
        <h2 className="font-heading text-xl font-bold">Squads multisig</h2>
        <p className="text-sm text-muted">
          On-chain treasury for $SVF creator fees and vault operations.
        </p>
        <div className="flex flex-wrap gap-3">
          <LinkButton href={site.treasurySquadsUrl} external>
            Open Squads treasury
          </LinkButton>
          <CopyAddressButton address={vaultAddresses.treasury} />
        </div>
        <p className="font-mono text-xs text-muted break-all">
          {vaultAddresses.treasury}
        </p>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="font-heading text-xl font-bold">Collector Crypt</h2>
        <p className="text-sm text-muted">Treasury and deployer gacha accounts.</p>
        <div className="flex flex-wrap gap-3">
          {collectorCryptAccounts.map((account) => (
            <LinkButton key={account.url} href={account.url} external variant="secondary">
              CC {account.label}
            </LinkButton>
          ))}
          <LinkButton href={links.gachaCollectorCrypt} external variant="ghost">
            Referral gacha
          </LinkButton>
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="font-heading text-xl font-bold">Physical vault profiles</h2>
        <div className="flex flex-wrap gap-3">
          <LinkButton href={vollector.url} external variant="secondary">
            {vollector.label}
          </LinkButton>
          <LinkButton href={links.vaulted} external variant="secondary">
            Vaulted
          </LinkButton>
          <LinkButton href={links.collectr} external variant="secondary">
            Collectr showcase
          </LinkButton>
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="font-heading text-xl font-bold">Solana Name Service</h2>
        <ul className="space-y-3 text-sm">
          <li className="flex flex-wrap items-center gap-2">
            <span className="text-muted">Treasury SNS:</span>
            <span className="font-mono text-foreground">{vaultAddresses.snsTreasury}</span>
            <CopyAddressButton address={vaultAddresses.snsTreasury} />
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <span className="text-muted">Deployer SNS:</span>
            <span className="font-mono text-foreground">{vaultAddresses.snsDeployer}</span>
            <CopyAddressButton address={vaultAddresses.snsDeployer} />
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <span className="text-muted">Deployer pubkey:</span>
            <span className="font-mono text-xs text-foreground break-all">
              {vaultAddresses.deployer}
            </span>
            <CopyAddressButton address={vaultAddresses.deployer} />
          </li>
        </ul>
      </Card>

      <div className="flex flex-wrap gap-3">
        <LinkButton href="/vault" variant="secondary">
          ← Vault gallery
        </LinkButton>
        <LinkButton href="/" variant="ghost">
          Home
        </LinkButton>
      </div>
    </div>
  );
}
