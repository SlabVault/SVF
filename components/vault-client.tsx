"use client";

import { useMemo, useState } from "react";
import { LinkButton } from "@/components/link-button";
import { SlabCard } from "@/components/slab-card";
import { EmptyState } from "@/components/empty-state";
import { SlabStatsStrip } from "@/components/slab-stats-strip";
import {
  VaultFilters,
  filterAndSortSlabs,
  type VaultSortBy,
  type VaultSortOrder,
} from "@/components/vault-filters";
import { SocialShare } from "@/components/social-share";
import { SLAB_GRID_CLASS } from "@/lib/layout";
import { VAULT_ROUTES } from "@/lib/vault-routes";
import type { SlabItem, SiteConfig } from "@/types/content";

type Props = {
  site: SiteConfig;
  slabs: SlabItem[];
  /** When true, renders as inventory section inside vault overview (no page chrome). */
  embedded?: boolean;
};

export function VaultClient({ site, slabs, embedded = false }: Props) {
  const [sortBy, setSortBy] = useState<VaultSortBy>("date");
  const [sortOrder, setSortOrder] = useState<VaultSortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSlabs = useMemo(
    () => filterAndSortSlabs(slabs, sortBy, sortOrder, searchQuery),
    [slabs, sortBy, sortOrder, searchQuery],
  );

  return (
    <section
      className={embedded ? "space-y-8 border-t border-line pt-12" : "animate-fade-in-up"}
      aria-labelledby="vault-inventory-heading"
    >
      <header className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <h2
              id="vault-inventory-heading"
              className="font-heading text-2xl font-bold tracking-tight sm:text-3xl"
            >
              Full vault inventory
            </h2>
            <p className="max-w-prose text-sm text-muted sm:text-base">
              Every slab is sourced from{" "}
              <span className="text-foreground">data/slabs.json</span> with public
              Vaulted and Collectr profiles. Listed inventory trades on the{" "}
              <a
                href="/trade"
                className="font-medium text-vault-amber underline-offset-4 hover:underline"
              >
                trade desk
              </a>
              .
            </p>
          </div>
          {!embedded ? (
            <SocialShare
              url="/vault"
              title="SlabVaultFi Vault"
              description="View the community-owned collectible vault"
            />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <LinkButton
            href="/trade"
            variant="secondary"
            className="transition-all duration-300 hover:scale-105"
            trackingEvent="cta_buy_vault_slabs_on_trade"
            trackingContext="vault_inventory"
          >
            Buy vault slabs on Trade →
          </LinkButton>
          <LinkButton
            href={VAULT_ROUTES.proof}
            variant="ghost"
            className="transition-all duration-300 hover:scale-105"
            trackingEvent="cta_open_proof_from_vault"
            trackingContext="vault_inventory"
          >
            Proof of reserves
          </LinkButton>
          <LinkButton
            href={site.links.vaulted}
            external
            variant="ghost"
            className="transition-all duration-300 hover:scale-105"
            trackingEvent="cta_open_vaulted_profile"
            trackingContext="vault_inventory"
          >
            Vaulted profile
          </LinkButton>
          <LinkButton
            href={site.links.collectr}
            external
            variant="ghost"
            className="transition-all duration-300 hover:scale-105"
            trackingEvent="cta_open_collectr_profile"
            trackingContext="vault_inventory"
          >
            Collectr showcase
          </LinkButton>
        </div>
      </header>

      {!embedded ? <SlabStatsStrip slabs={slabs} /> : null}

      <VaultFilters
        slabs={slabs}
        sortBy={sortBy}
        sortOrder={sortOrder}
        searchQuery={searchQuery}
        onSortByChange={setSortBy}
        onSortOrderChange={setSortOrder}
        onSearchQueryChange={setSearchQuery}
      />

      <div className={`${SLAB_GRID_CLASS} animate-slide-in`}>
        {filteredSlabs.length === 0 ? (
          <EmptyState
            title="No slabs found"
            description="Try adjusting your filters or check back later for new additions to the vault."
          />
        ) : (
          filteredSlabs.map((slab, index) => (
            <div
              key={slab.id}
              style={{ animationDelay: `${index * 50}ms` }}
              className="animate-fade-in-up"
            >
              <SlabCard slab={slab} />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
