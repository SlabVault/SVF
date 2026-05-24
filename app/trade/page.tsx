import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TradeLandingDeskClient } from "@/components/trade/trade-landing-desk-client";
import { buildGrailsTradeMetadata } from "@/lib/seo";
import { isRwaTradeEnabled } from "@/lib/trade-config";
import {
  enrichTradeLandingCollectionsWithTensor,
  getTradeLandingCollections,
  getTradeLandingStats,
  loadOptionalTradeLandingTreasuryContext,
  loadTradeLandingPartnerPreviews,
} from "@/lib/trade-landing";
import {
  buildAllListingsAggregateStats,
  mergeAllTradeListings,
} from "@/lib/trade/all-listings";
import {
  applyMergedAllListingsAggregateOverride,
  getTradeLandingAggregateFromCollections,
} from "@/lib/trade-landing-aggregate";
import { getTradeCollectionActivity } from "@/lib/trade/trade-activity";

export const metadata: Metadata = buildGrailsTradeMetadata("/trade");

export const dynamic = "force-dynamic";

export default async function TradePage() {
  if (!isRwaTradeEnabled()) {
    notFound();
  }

  const [treasuryContext, partnerContext] = await Promise.all([
    loadOptionalTradeLandingTreasuryContext(),
    loadTradeLandingPartnerPreviews(),
  ]);

  const collections = await enrichTradeLandingCollectionsWithTensor(
    getTradeLandingCollections(treasuryContext.treasuryStats, {
      treasuryUnavailable: treasuryContext.treasuryUnavailable,
      partnerPreviews: partnerContext.previews,
    }),
  );

  const deskListings = mergeAllTradeListings([
    partnerContext.partnerListings,
    treasuryContext.deskListings,
  ]);

  const activity = await getTradeCollectionActivity("collector-crypt", {
    listings: partnerContext.partnerListings,
    limit: 12,
  });

  const landingStats = getTradeLandingStats({
    partnerPreviews: partnerContext.previews,
    treasuryListedCount: treasuryContext.treasuryStats?.listedCount,
  });

  const previewAggregate = getTradeLandingAggregateFromCollections(collections);
  const mergedStats = buildAllListingsAggregateStats(deskListings);
  const landingAggregateOverride = applyMergedAllListingsAggregateOverride(
    previewAggregate,
    mergedStats,
    { listings: deskListings },
  );

  return (
    <TradeLandingDeskClient
      collections={collections}
      landingAggregateOverride={landingAggregateOverride}
      landingStats={landingStats}
      activity={activity}
    />
  );
}
