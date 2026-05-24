import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { VaultClient } from "@/components/vault-client";
import { VaultHeroSection } from "@/components/vault-hero-section";
import { VaultOverview } from "@/components/vault-overview";
import { VaultSubNav } from "@/components/vault-sub-nav";
import { buildPageMetadata } from "@/lib/seo";
import { getPulls, getSiteConfig, getSlabs } from "@/lib/site-config";
import { VAULT_ROUTES } from "@/lib/vault-routes";

export const metadata: Metadata = buildPageMetadata({
  title: "Vault",
  description:
    "SlabVaultFi community treasury — $SVF flywheel, live pulls, gacha tiers, proof of reserves, featured slabs, and full multisig inventory. Trading aggregation lives on /trade.",
  path: VAULT_ROUTES.overview,
  keywords: [
    "community vault",
    "vault flywheel",
    "proof of reserves",
    "graded collectibles",
    "live gacha pulls",
  ],
});

export default function VaultPage() {
  const site = getSiteConfig();
  const slabs = getSlabs();
  const pulls = getPulls();

  return (
    <>
      <VaultHeroSection site={site} slabs={slabs} />

      <div className="page-shell space-y-10 sm:space-y-12">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Vault", href: VAULT_ROUTES.overview },
          ]}
        />

        <div className="page-header">
          <VaultSubNav />
        </div>

        <VaultOverview site={site} slabs={slabs} pulls={pulls} />

        <VaultClient site={site} slabs={slabs} embedded />
      </div>
    </>
  );
}
