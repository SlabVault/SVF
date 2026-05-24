import type { Metadata } from "next";

import { HeroSection } from "@/components/hero-section";
import { HomeLivePulse } from "@/components/home-live-pulse";
import { HomeTradeCta } from "@/components/home-trade-cta";
import { HomeValueProp } from "@/components/home-value-prop";
import { PlatformLogosStrip } from "@/components/platform-logos-strip";
import { VaultFlywheel } from "@/components/vault-flywheel";
import { VaultTreasuryTeaser } from "@/components/vault-treasury-teaser";
import { getPulls, getSiteConfig, getSlabs } from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/seo";

export default async function Home() {
  const site = getSiteConfig();
  const slabs = getSlabs();
  const pulls = getPulls();

  return (
    <>
      <HeroSection site={site} slabs={slabs} />
      <PlatformLogosStrip />

      <div className="page-shell space-y-14 sm:space-y-16 lg:space-y-20">
        <VaultFlywheel />
        <HomeLivePulse site={site} slabs={slabs} pulls={pulls} />
        <HomeValueProp />
        <VaultTreasuryTeaser />
        <HomeTradeCta />
      </div>
    </>
  );
}

export const metadata: Metadata = buildPageMetadata({
  title: "Home",
  description:
    "SlabVault — a Solana-native community-owned collectible vault. Live pulls, graded slabs, transparent treasury, and $SVF coordination. Launch GRAILS for graded-card trading.",
  path: "/",
  keywords: [
    "community vault",
    "graded slabs",
    "Solana collectibles",
    "SVF token",
    "GRAILS",
    "collectible treasury",
  ],
  imageAlt: "SlabVault community collectible vault on Solana",
});
