"use client";

import { useMemo, useState } from "react";
import { PullRow } from "@/components/pull-row";
import { PullStatsStrip } from "@/components/pull-stats-strip";
import {
  PullsFilters,
  filterAndSortPulls,
  type PullSortBy,
  type PullSortOrder,
} from "@/components/pulls-filters";
import { LinkButton } from "@/components/link-button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SocialShare } from "@/components/social-share";
import { EmptyState } from "@/components/empty-state";
import { summarizePulls } from "@/lib/pull-stats";
import type { PullItem } from "@/types/content";

type Props = {
  pulls: PullItem[];
};

export function PullsClient({ pulls }: Props) {
  const [sortBy, setSortBy] = useState<PullSortBy>("date");
  const [sortOrder, setSortOrder] = useState<PullSortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPulls = useMemo(
    () => filterAndSortPulls(pulls, sortBy, sortOrder, searchQuery),
    [pulls, sortBy, sortOrder, searchQuery],
  );
  const stats = summarizePulls(filteredPulls);

  return (
    <div className="page-shell">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Vault", href: "/vault" },
          { label: "Pulls", href: "/pulls" },
        ]}
      />

      <header className="page-header space-y-6 animate-fade-in-up">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-4">
            <h1 className="font-display text-4xl font-semibold tracking-tight">
              Pull history
            </h1>
            <p className="max-w-prose text-muted">
              A transparent ledger of gacha outcomes. Populate{" "}
              <span className="text-foreground">data/pulls.json</span> after each stream
              with cost, outcome, partner, and clip links.
            </p>
          </div>
          <SocialShare url="/pulls" title="SlabVaultFi Pull History" description="View transparent gacha pull history and ROI" />
        </div>
        <div className="flex flex-wrap gap-3">
          <LinkButton
            href="/vault"
            variant="secondary"
            className="transition-all duration-300 hover:scale-105"
            trackingEvent="cta_open_vault_from_pulls"
            trackingContext="pulls_header"
          >
            View vault
          </LinkButton>
          <LinkButton
            href="/community"
            variant="ghost"
            className="transition-all duration-300 hover:scale-105"
            trackingEvent="cta_open_community_from_pulls"
            trackingContext="pulls_header"
          >
            Community
          </LinkButton>
        </div>
      </header>

      <PullStatsStrip stats={stats} />

      <PullsFilters
        pulls={pulls}
        sortBy={sortBy}
        sortOrder={sortOrder}
        searchQuery={searchQuery}
        onSortByChange={setSortBy}
        onSortOrderChange={setSortOrder}
        onSearchQueryChange={setSearchQuery}
      />

      <div className="space-y-3 animate-slide-in">
        {filteredPulls.length === 0 ? (
          <EmptyState
            title="No pulls found"
            description="Try adjusting your filters or check back later for new pull history."
          />
        ) : (
          filteredPulls.map((pull, index) => (
            <div key={pull.id} style={{ animationDelay: `${index * 50}ms` }} className="animate-fade-in-up">
              <PullRow pull={pull} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
