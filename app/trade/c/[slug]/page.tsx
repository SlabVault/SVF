import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TradeCollectionDeskClient } from "@/components/trade/trade-collection-desk-client";
import { TradePartnerCollectionDesk } from "@/components/trade/trade-partner-collection-desk";
import type { TradeCollectionSocialLinks } from "@/components/trade/trade-desk-header";
import { getTradeCollectionBySlug, type TradeCollectionConfig } from "@/lib/onchain/collections";
import {
  isPartnerIngestSupported,
  listPartnerTradeListings,
} from "@/lib/partner-listings";
import { buildPageMetadata } from "@/lib/seo";
import { isRwaTradeEnabled } from "@/lib/trade-config";
import {
  loadOptionalTradeLandingTreasuryContext,
  loadTradeLandingNavCollections,
} from "@/lib/trade-landing";
import { fetchTensorRibbonMetricsForCollection } from "@/lib/trade/tensor-ribbon-metrics";
import { getTradeCollectionDepth } from "@/lib/trade/tensor-collection-depth";
import { getTradeCollectionActivity } from "@/lib/trade/trade-activity";
import {
  computeTradeCollectionStats,
  mapSlabsToTradeListings,
} from "@/lib/trade-listings";
import { resolveCollectionDeskStats } from "@/lib/trade/tensor-ribbon-metrics";
import { TRADE_ROUTES } from "@/lib/trade-routes";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function pickCollectionSocialLinks(
  collection: TradeCollectionConfig,
): TradeCollectionSocialLinks {
  const meta = collection as TradeCollectionConfig & TradeCollectionSocialLinks;
  const normalize = (value: unknown) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };
  return {
    websiteUrl: normalize(meta.websiteUrl),
    discordUrl: normalize(meta.discordUrl),
    twitterUrl: normalize(meta.twitterUrl),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const collection = getTradeCollectionBySlug(slug);

  if (!collection) {
    return buildPageMetadata({
      title: "Collection not found",
      description: "Trade collection not found on SlabVaultFi.",
      path: TRADE_ROUTES.collection(slug),
    });
  }

  return buildPageMetadata({
    title: `${collection.name} · Trade`,
    description: `Browse ${collection.name} graded slabs on SlabVault trade desk.`,
    path: TRADE_ROUTES.collection(slug),
  });
}

export default async function TradeCollectionPage({ params }: PageProps) {
  if (!isRwaTradeEnabled()) {
    notFound();
  }

  const { slug } = await params;
  const collection = getTradeCollectionBySlug(slug);

  if (!collection) {
    notFound();
  }

  const collectionSocialLinks = pickCollectionSocialLinks(collection);

  if (isPartnerIngestSupported(collection.partner)) {
    const [collections, partnerResult, tensorRibbon] = await Promise.all([
      loadTradeLandingNavCollections(),
      listPartnerTradeListings(collection),
      fetchTensorRibbonMetricsForCollection(collection.slug),
    ]);

    const activity = await getTradeCollectionActivity(collection.slug, {
      listings: partnerResult.listings,
      seedOnly: partnerResult.fromFallback,
    });

    return (
      <TradePartnerCollectionDesk
        collection={collection}
        collectionSocialLinks={collectionSocialLinks}
        collections={collections}
        listings={partnerResult.listings}
        stats={resolveCollectionDeskStats(
          partnerResult.stats,
          partnerResult.listings,
          activity.events,
        )}
        partnerMeta={{
          source: "partner_ingest",
          fromFallback: partnerResult.fromFallback,
          dbStatus: partnerResult.dbStatus,
          sources: partnerResult.sources,
        }}
        listResult={undefined}
        activity={activity}
        tensorRibbon={tensorRibbon}
      />
    );
  }

  if (collection.partner === "magic_eden") {
    const [collections, depth, tensorRibbon] = await Promise.all([
      loadTradeLandingNavCollections(),
      getTradeCollectionDepth(collection),
      fetchTensorRibbonMetricsForCollection(collection.slug),
    ]);

    const activity = await getTradeCollectionActivity(collection.slug, {
      listings: depth.listings,
    });

    return (
      <TradePartnerCollectionDesk
        collection={collection}
        collectionSocialLinks={collectionSocialLinks}
        collections={collections}
        listings={depth.listings}
        stats={resolveCollectionDeskStats(
          depth.stats,
          depth.listings,
          activity.events,
        )}
        depth={depth}
        activity={activity}
        tensorRibbon={tensorRibbon}
      />
    );
  }

  if (collection.slug === "slabvault-treasury") {
    const [collections, treasuryContext, tensorRibbon] = await Promise.all([
      loadTradeLandingNavCollections(),
      loadOptionalTradeLandingTreasuryContext(),
      fetchTensorRibbonMetricsForCollection(collection.slug),
    ]);
    const listResult = treasuryContext.listResult ?? {
      slabs: [],
      fromFallback: true,
      dbStatus: "unreachable" as const,
    };
    const listings = mapSlabsToTradeListings(listResult.slabs, collection.slug);
    const activity = await getTradeCollectionActivity(collection.slug, { listings });
    const stats = resolveCollectionDeskStats(
      computeTradeCollectionStats(listings),
      listings,
      activity.events,
    );

    return (
      <TradeCollectionDeskClient
        collection={collection}
        collectionSocialLinks={collectionSocialLinks}
        collections={collections}
        listings={listings}
        stats={stats}
        listResult={listResult}
        activity={activity}
        tensorRibbon={tensorRibbon}
        syntheticActivity
      />
    );
  }

  notFound();
}
