"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { VaultSubNav } from "@/components/vault-sub-nav";
import { EmptyState } from "@/components/empty-state";
import {
  MarketplaceFilters,
  filterAndSortMarketplaceSlabs,
  type MarketplaceSortBy,
  type MarketplaceSortOrder,
} from "@/components/marketplace-filters";
import { MarketplaceListingCard } from "@/components/marketplace-listing-card";
import { MarketplaceStatusFilter } from "@/components/marketplace-status-filter";
import { LinkButton } from "@/components/link-button";
import { Button } from "@/components/ui/button";
import { SLAB_GRID_CLASS } from "@/lib/layout";
import { MARKETPLACE_BUY_CTA } from "@/lib/platform-labels";
import type { MarketplaceListResult } from "@/lib/marketplace-slabs";
import type { SiteConfig } from "@/types/content";
import { TRADE_ROUTES } from "@/lib/trade-routes";
import { VAULT_ROUTES } from "@/lib/vault-routes";

type Props = {
  site: SiteConfig;
  statusFilter: "AVAILABLE" | "SOLD";
  listResult: MarketplaceListResult;
};

export function MarketplaceClient({ site, statusFilter, listResult }: Props) {
  const { slabs, fromFallback, dbStatus, dbHint } = listResult;
  const [sortBy, setSortBy] = useState<MarketplaceSortBy>("date");
  const [sortOrder, setSortOrder] = useState<MarketplaceSortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSlabs = useMemo(
    () => filterAndSortMarketplaceSlabs(slabs, sortBy, sortOrder, searchQuery),
    [slabs, sortBy, sortOrder, searchQuery],
  );

  return (
    <div className="page-shell">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Vault", href: VAULT_ROUTES.overview },
          { label: "Shop", href: VAULT_ROUTES.shop },
        ]}
      />

      <div className="page-header space-y-4">
        <VaultSubNav />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Vault Shop
            </h1>
            <p className="text-lg text-muted">
              {MARKETPLACE_BUY_CTA} — vault inventory with split SOL + SVF checkout on
              SlabVault.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton href={TRADE_ROUTES.portfolio} variant="secondary" className="text-sm">
              My portfolio
            </LinkButton>
            <MarketplaceStatusFilter currentStatus={statusFilter} />
          </div>
        </div>
        <p className="max-w-3xl rounded-lg border border-line bg-vault-panel/50 px-4 py-3 text-sm text-muted">
          Listings are public and linked to treasury flows. Verify each purchase path
          using{" "}
          <Link
            href="/vault/proof"
            className="font-medium text-vault-amber underline-offset-4 hover:underline"
            data-growth-event="cta_open_proof_from_marketplace"
            data-growth-context="marketplace_header"
          >
            proof of reserves
          </Link>{" "}
          and the{" "}
          <Link
            href="/faq"
            className="font-medium text-vault-amber underline-offset-4 hover:underline"
            data-growth-event="cta_open_faq_from_marketplace"
            data-growth-context="marketplace_header"
          >
            FAQ
          </Link>{" "}
          before checkout. New purchases route through{" "}
          <Link
            href="/trade"
            className="font-medium text-vault-amber underline-offset-4 hover:underline"
            data-growth-event="cta_open_trade_from_marketplace"
            data-growth-context="marketplace_header"
          >
            Trade
          </Link>
          .
        </p>
        {dbStatus === "unconfigured" && fromFallback ? (
          <p
            className="rounded-lg border border-line bg-vault-panel/60 px-4 py-3 text-sm text-muted"
            role="status"
            aria-live="polite"
          >
            <span className="font-medium text-foreground">Demo mode — </span>
            Showing browse-only listings from{" "}
            <code className="text-foreground">data/slabs.json</code>. Set{" "}
            <code className="text-foreground">DATABASE_URL</code> to a direct{" "}
            <code className="text-foreground">postgresql://</code> connection,
            run <code className="text-foreground">npm run db:push</code> and{" "}
            <code className="text-foreground">npm run db:seed</code>, or add
            slabs via admin for live checkout.
          </p>
        ) : null}
        {dbStatus === "unreachable" && fromFallback ? (
          <p
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-muted"
            role="status"
            aria-live="polite"
          >
            <span className="font-medium text-foreground">
              Database unreachable
            </span>
            {" — "}
            {dbHint ??
              "Check DATABASE_URL and ensure Postgres is running."}{" "}
            Showing browse-only demo listings until the connection is fixed.
          </p>
        ) : null}
      </div>

      {slabs.length > 0 ? (
        <MarketplaceFilters
          slabs={slabs}
          sortBy={sortBy}
          sortOrder={sortOrder}
          searchQuery={searchQuery}
          onSortByChange={setSortBy}
          onSortOrderChange={setSortOrder}
          onSearchQueryChange={setSearchQuery}
        />
      ) : null}

      {slabs.length === 0 ? (
        <EmptyState
          title={
            statusFilter === "SOLD"
              ? "No sold listings yet"
              : dbStatus === "connected"
                ? "No listings available right now"
                : "Next listing after tonight\u2019s stream"
          }
          description={
            statusFilter === "SOLD"
              ? "Completed sales appear here once checkout finishes."
              : dbStatus === "connected"
                ? "Add slabs in admin or run npm run db:seed to populate the marketplace."
                : "New vault slabs are listed after live pulls. Follow for drop alerts."
          }
        >
          <LinkButton
            href={site.links.twitter}
            external
            trackingEvent="cta_follow_x_empty_marketplace"
            trackingContext="marketplace_empty_state"
          >
            Follow on X
          </LinkButton>
          <LinkButton
            href={site.links.telegram}
            external
            variant="secondary"
            trackingEvent="cta_join_telegram_empty_marketplace"
            trackingContext="marketplace_empty_state"
          >
            Telegram
          </LinkButton>
          <Button variant="outline" asChild>
            <Link
              href="/streams"
              data-growth-event="cta_open_streams_empty_marketplace"
              data-growth-context="marketplace_empty_state"
            >
              Streams
            </Link>
          </Button>
        </EmptyState>
      ) : filteredSlabs.length === 0 ? (
        <EmptyState
          title="No listings match your search"
          description="Try a different search term or reset the sort filters."
        >
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSearchQuery("");
              setSortBy("date");
              setSortOrder("desc");
            }}
          >
            Clear filters
          </Button>
        </EmptyState>
      ) : (
        <div className={SLAB_GRID_CLASS}>
          {filteredSlabs.map((slab, index) => (
            <MarketplaceListingCard
              key={slab.id}
              slab={slab}
              statusFilter={statusFilter}
              priority={index < 3}
            />
          ))}
        </div>
      )}
    </div>
  );
}
