import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { LinkButton } from "@/components/link-button";
import { CopyAddressButton } from "@/components/copy-address-button";
import { Card } from "@/components/ui/card";
import { VaultSubNav } from "@/components/vault-sub-nav";
import { buildPageMetadata } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config";

export const metadata: Metadata = buildPageMetadata({
  title: "Proof of reserves",
  description:
    "Official treasury, SNS, and vault profile links to verify SlabVaultFi reserves.",
  path: "/vault/proof",
  keywords: ["proof of reserves", "treasury verification", "vault links"],
});

export default function ProofOfReservesPage() {
  const site = getSiteConfig();
  const { links, vaultAddresses, collectorCryptAccounts, vollector } = site;

  return (
    <div className="page-shell space-y-10 sm:space-y-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Vault", href: "/vault" },
          { label: "Proof of reserves", href: "/vault/proof" },
        ]}
      />

      <header className="space-y-4">
        <VaultSubNav />
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
          <LinkButton
            href={site.treasurySquadsUrl}
            external
            trackingEvent="cta_open_squads_treasury"
            trackingContext="proof_squads_card"
          >
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
            <LinkButton
              key={account.url}
              href={account.url}
              external
              variant="secondary"
              trackingEvent="cta_open_collector_crypt_account"
              trackingContext={`proof_collector_crypt:${account.label}`}
            >
              CC {account.label}
            </LinkButton>
          ))}
          <LinkButton
            href={links.gachaCollectorCrypt}
            external
            variant="ghost"
            trackingEvent="cta_open_collector_crypt_referral"
            trackingContext="proof_collector_crypt"
          >
            Referral gacha
          </LinkButton>
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="font-heading text-xl font-bold">Physical vault profiles</h2>
        <div className="flex flex-wrap gap-3">
          <LinkButton
            href={vollector.url}
            external
            variant="secondary"
            trackingEvent="cta_open_vollector_profile"
            trackingContext="proof_profiles"
          >
            {vollector.label}
          </LinkButton>
          <LinkButton
            href={links.vaulted}
            external
            variant="secondary"
            trackingEvent="cta_open_vaulted_profile"
            trackingContext="proof_profiles"
          >
            Vaulted
          </LinkButton>
          <LinkButton
            href={links.collectr}
            external
            variant="secondary"
            trackingEvent="cta_open_collectr_profile"
            trackingContext="proof_profiles"
          >
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
        <LinkButton
          href="/vault"
          variant="secondary"
          trackingEvent="cta_back_to_vault_from_proof"
          trackingContext="proof_footer"
        >
          ← Vault gallery
        </LinkButton>
        <LinkButton
          href="/"
          variant="ghost"
          trackingEvent="cta_home_from_proof"
          trackingContext="proof_footer"
        >
          Home
        </LinkButton>
      </div>
    </div>
  );
}
