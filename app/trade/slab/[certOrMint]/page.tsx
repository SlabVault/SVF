import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TradeItemDetailClient } from "@/components/trade/trade-item-detail-client";
import { getTradeCollectionBySlug } from "@/lib/onchain/collections";
import { listMarketplaceSlabs } from "@/lib/marketplace-slabs";
import {
  isPartnerIngestSupported,
  listPartnerTradeListings,
} from "@/lib/partner-listings";
import { buildPageMetadata } from "@/lib/seo";
import { isRwaTradeEnabled } from "@/lib/trade-config";
import { getTradeLandingCollections } from "@/lib/trade-landing";
import { getTradeCollectionActivity } from "@/lib/trade/trade-activity";
import { getTradeItemAdjacentLinks } from "@/lib/trade/item-navigation";
import { fetchTensorRibbonMetricsForCollection } from "@/lib/trade/tensor-ribbon-metrics";
import { loadAllTradeListings } from "@/lib/trade/all-listings";
import { extractCertNumber } from "@/lib/trade/extract-cert-number";
import { resolveTradeListing } from "@/lib/trade/resolve-listing";
import {
  buildVenueCompareRows,
  type VenueCompareRow,
} from "@/lib/trade/venue-compare";
import {
  computeTradeCollectionStats,
  mapSlabsToTradeListings,
} from "@/lib/trade-listings";
import { fetchSolUsdPrice } from "@/lib/sol-price";
import { TRADE_ROUTES } from "@/lib/trade-routes";

type PageProps = {
  params: Promise<{ certOrMint: string }>;
  searchParams: Promise<{ collection?: string }>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { certOrMint } = await params;
  const { collection: collectionSlug = "slabvault-treasury" } = await searchParams;
  const listing = await resolveTradeListing(certOrMint, collectionSlug);

  if (!listing) {
    return buildPageMetadata({
      title: "Slab not found",
      description: "Trade listing not found.",
      path: TRADE_ROUTES.slab(certOrMint),
    });
  }

  return buildPageMetadata({
    title: `${listing.name} · Trade`,
    description: `${listing.grade} — ${listing.askSol} SOL ask on SlabVault trade.`,
    path: TRADE_ROUTES.slab(certOrMint),
  });
}

export default async function TradeSlabPage({ params, searchParams }: PageProps) {
  if (!isRwaTradeEnabled()) {
    notFound();
  }

  const { certOrMint } = await params;
  const { collection: collectionSlug = "slabvault-treasury" } = await searchParams;
  const collection = getTradeCollectionBySlug(collectionSlug);

  if (!collection) {
    notFound();
  }

  const listing = await resolveTradeListing(certOrMint, collectionSlug);
  if (!listing) {
    notFound();
  }

  let collectionStats = computeTradeCollectionStats([listing]);
  let activityListings = [listing];
  let treasuryStats: { floorSol: number | null; listedCount: number } | undefined;

  if (collection.slug === "slabvault-treasury") {
    const listResult = await listMarketplaceSlabs({ status: "AVAILABLE" });
    const treasuryListings = mapSlabsToTradeListings(listResult.slabs, collection.slug);
    collectionStats = computeTradeCollectionStats(treasuryListings);
    activityListings = treasuryListings;
    treasuryStats = {
      floorSol: collectionStats.floorSol,
      listedCount: collectionStats.listedCount,
    };
  } else if (isPartnerIngestSupported(collection.partner)) {
    const partnerResult = await listPartnerTradeListings(collection);
    collectionStats = partnerResult.stats;
    activityListings = partnerResult.listings;
  }

  const needsVenueCompare = isPartnerIngestSupported(collection.partner);

  const [activity, tensorRibbon, solPriceUsd, aggregateResult] = await Promise.all([
    getTradeCollectionActivity(collection.slug, {
      listings: activityListings,
    }),
    fetchTensorRibbonMetricsForCollection(collection.slug),
    fetchSolUsdPrice(),
    needsVenueCompare ? loadAllTradeListings() : Promise.resolve(null),
  ]);

  let venueCompareRows: VenueCompareRow[] = [];
  if (aggregateResult && listing) {
    const certKey = extractCertNumber(listing) ?? certOrMint.replace(/^#/, "");
    const merged =
      aggregateResult.listings.find(
        (row) =>
          row.id === listing.id ||
          extractCertNumber(row) === certKey ||
          row.id === certOrMint,
      ) ?? null;
    if (merged) {
      venueCompareRows = buildVenueCompareRows(merged);
    }
  }
  const collections = getTradeLandingCollections(treasuryStats);
  const adjacentItems = getTradeItemAdjacentLinks(
    activityListings,
    listing,
    collection.slug,
  );

  return (
    <TradeItemDetailClient
      listing={listing}
      collection={collection}
      collections={collections}
      collectionStats={collectionStats}
      activity={activity}
      adjacentItems={adjacentItems}
      tensorRibbon={tensorRibbon}
      solPriceUsd={solPriceUsd}
      venueCompareRows={venueCompareRows}
    />
  );
}
