"use client";

import { useState } from "react";
import { LinkButton } from "@/components/link-button";
import { SlabCard } from "@/components/slab-card";
import { Card } from "@/components/ui/card";
import { SkeletonCard } from "@/components/skeleton-card";
import { SlabStatsStrip } from "@/components/slab-stats-strip";
import { VaultFilters } from "@/components/vault-filters";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SocialShare } from "@/components/social-share";
import type { SlabItem, SiteConfig } from "@/types/content";

type Props = {
  site: SiteConfig;
  slabs: SlabItem[];
};

export function VaultClient({ site, slabs }: Props) {
  const [filteredSlabs, setFilteredSlabs] = useState(slabs);
  const [isLoading, setIsLoading] = useState(false);

  const handleFilterChange = (newFilteredSlabs: SlabItem[]) => {
    setIsLoading(true);
    setTimeout(() => {
      setFilteredSlabs(newFilteredSlabs);
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-14 sm:space-y-14 sm:px-5 sm:py-16">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Vault", href: "/vault" }]} />

      <header className="space-y-6 animate-fade-in-up">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-4">
            <h1 className="font-display text-4xl font-semibold tracking-tight">
              Vault
            </h1>
            <p className="max-w-prose text-muted">
              Every slab below is sourced from <span className="text-foreground">data/slabs.json</span>{" "}
              so you can update the gallery without touching code. Pair this page with
              Vaulted / Collectr for provenance photos and serials.
            </p>
          </div>
          <SocialShare url="/vault" title="SlabVaultFi Vault" description="View the community-owned collectible vault" />
        </div>
        <div className="flex flex-wrap gap-3">
          <LinkButton href={site.links.vaulted} external variant="secondary" className="transition-all duration-300 hover:scale-105">
            Vaulted profile
          </LinkButton>
          <LinkButton href={site.links.collectr} external variant="ghost" className="transition-all duration-300 hover:scale-105">
            Collectr showcase
          </LinkButton>
        </div>
      </header>

      <SlabStatsStrip slabs={slabs} />

      <VaultFilters slabs={slabs} onFilteredSlabsChange={handleFilterChange} />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-slide-in">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)
          : filteredSlabs.length === 0
            ? (
              <Card className="col-span-full space-y-4 p-8 text-center bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
                <p className="font-display text-2xl font-semibold text-foreground">No slabs found</p>
                <p className="text-muted">
                  Try adjusting your filters or check back later for new additions to the vault.
                </p>
              </Card>
            )
            : filteredSlabs.map((slab, index) => (
                <div key={slab.id} style={{ animationDelay: `${index * 50}ms` }} className="animate-fade-in-up">
                  <SlabCard slab={slab} />
                </div>
              ))}
      </div>
    </div>
  );
}
