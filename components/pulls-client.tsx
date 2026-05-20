"use client";

import { useState } from "react";
import { PullRow } from "@/components/pull-row";
import { PullStatsStrip } from "@/components/pull-stats-strip";
import { PullsFilters } from "@/components/pulls-filters";
import { LinkButton } from "@/components/link-button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SocialShare } from "@/components/social-share";
import { Card } from "@/components/ui/card";
import { summarizePulls } from "@/lib/pull-stats";
import type { PullItem } from "@/types/content";

type Props = {
  pulls: PullItem[];
};

export function PullsClient({ pulls }: Props) {
  const [filteredPulls, setFilteredPulls] = useState(pulls);
  const [isLoading, setIsLoading] = useState(false);
  const stats = summarizePulls(filteredPulls);

  const handleFilterChange = (newFilteredPulls: PullItem[]) => {
    setIsLoading(true);
    setTimeout(() => {
      setFilteredPulls(newFilteredPulls);
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-14 sm:space-y-14 sm:px-5 sm:py-16">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Pulls", href: "/pulls" }]} />

      <header className="space-y-6 animate-fade-in-up">
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
          <LinkButton href="/vault" variant="secondary" className="transition-all duration-300 hover:scale-105">
            View vault
          </LinkButton>
          <LinkButton href="/community" variant="ghost" className="transition-all duration-300 hover:scale-105">
            Community
          </LinkButton>
        </div>
      </header>

      <PullStatsStrip stats={stats} />

      <PullsFilters pulls={pulls} onFilteredPullsChange={handleFilterChange} />

      <div className="space-y-3 animate-slide-in">
        {isLoading
          ? Array.from({ length: 5 }).map((_, index) => (
              <Card key={index} className="p-5 animate-pulse">
                <div className="h-4 w-24 bg-vault-panel rounded mb-3" />
                <div className="h-3 w-3/4 bg-vault-panel rounded" />
              </Card>
            ))
          : filteredPulls.length === 0
            ? (
              <Card className="space-y-4 p-8 text-center bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
                <p className="font-display text-2xl font-semibold text-foreground">No pulls found</p>
                <p className="text-muted">
                  Try adjusting your filters or check back later for new pull history.
                </p>
              </Card>
            )
            : filteredPulls.map((pull, index) => (
                <div key={pull.id} style={{ animationDelay: `${index * 50}ms` }} className="animate-fade-in-up">
                  <PullRow pull={pull} />
                </div>
              ))}
      </div>
    </div>
  );
}
