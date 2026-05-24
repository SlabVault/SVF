import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Suspense } from "react";

import { PageLoadingCard } from "@/components/page-loading-card";
import { TradePortfolioClient } from "@/components/trade-portfolio-client";
import { listMarketplaceSlabs } from "@/lib/marketplace-slabs";
import { buildPageMetadata } from "@/lib/seo";
import { isRwaTradeEnabled } from "@/lib/trade-config";
import {
  getTradeLandingCollections,
  getTradeLandingTreasuryStats,
} from "@/lib/trade-landing";
import { TRADE_ROUTES } from "@/lib/trade-routes";

export const metadata: Metadata = buildPageMetadata({
  title: "Portfolio · Trade",
  description:
    "Your SlabVault trade portfolio — active listings and purchase history.",
  path: TRADE_ROUTES.portfolio,
  noIndex: true,
});

export default async function TradePortfolioPage() {
  if (!isRwaTradeEnabled()) {
    notFound();
  }

  const listResult = await listMarketplaceSlabs({ status: "AVAILABLE" });
  const treasuryStats = getTradeLandingTreasuryStats(listResult.slabs);
  const collections = getTradeLandingCollections(treasuryStats);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center p-6">
          <PageLoadingCard title="Loading portfolio…" />
        </div>
      }
    >
      <TradePortfolioClient collections={collections} />
    </Suspense>
  );
}
