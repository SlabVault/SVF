import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TradeCollectionDeskClient } from "@/components/trade/trade-collection-desk-client";
import {
  ALL_LISTINGS_COLLECTION,
  ALL_LISTINGS_SLUG,
  loadAllTradeListings,
} from "@/lib/trade/all-listings";
import { buildPageMetadata } from "@/lib/seo";
import { isRwaTradeEnabled } from "@/lib/trade-config";
import { loadTradeLandingNavCollections } from "@/lib/trade-landing";
import { enrichTradeCollectionStatsWithActivity } from "@/lib/trade-listings";
import { getTradeCollectionActivity } from "@/lib/trade/trade-activity";
import { TRADE_ROUTES } from "@/lib/trade-routes";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "All Listings · Trade",
    description:
      "Browse graded slabs across Collector Crypt, Phygitals, Magic Eden, Beezie, Courtyard, and SlabVault treasury.",
    path: TRADE_ROUTES.all,
  });
}

export default async function TradeAllListingsPage() {
  if (!isRwaTradeEnabled()) {
    notFound();
  }

  const [result, collections] = await Promise.all([
    loadAllTradeListings(),
    loadTradeLandingNavCollections(),
  ]);

  const activity = await getTradeCollectionActivity(ALL_LISTINGS_SLUG, {
    listings: result.listings,
    seedOnly: result.fromFallback,
  });

  const stats = enrichTradeCollectionStatsWithActivity(
    result.stats,
    activity.events,
  );

  return (
    <TradeCollectionDeskClient
      collection={ALL_LISTINGS_COLLECTION}
      collections={collections}
      listings={result.listings}
      stats={stats}
      activity={activity}
      navActiveSlug={ALL_LISTINGS_SLUG}
      navAggregateOverride={{
        listedCount: result.aggregate.listedCount,
        floorSol: result.aggregate.floorSol,
      }}
      venuesCount={result.venueCount}
      aggregateDesk
      syntheticActivity={activity.source === "synthetic"}
    />
  );
}
