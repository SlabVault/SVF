"use client";

import {
  TradeCollectionDeskClient,
  type TradeCollectionPartnerMeta,
} from "@/components/trade/trade-collection-desk-client";
import type { TradeCollectionSocialLinks } from "@/components/trade/trade-desk-header";
import type { TradeCollectionConfig } from "@/lib/onchain/collections";
import type { TradeLandingCollectionPreview } from "@/lib/trade-landing";
import type { TradeActivityFeedResult } from "@/lib/trade/trade-activity";
import type { TradeCollectionDepth } from "@/lib/trade/tensor-collection-depth";
import type { TensorRibbonMetrics } from "@/lib/trade/tensor-ribbon-metrics";
import {
  computeTradeCollectionStats,
  type TradeListing,
} from "@/lib/trade-listings";
import type { MarketplaceListResult } from "@/lib/marketplace-slabs";

type Props = {
  collection: TradeCollectionConfig;
  collections: TradeLandingCollectionPreview[];
  collectionSocialLinks?: TradeCollectionSocialLinks;
  listings: TradeListing[];
  stats: ReturnType<typeof computeTradeCollectionStats>;
  partnerMeta?: TradeCollectionPartnerMeta;
  depth?: TradeCollectionDepth;
  listResult?: MarketplaceListResult;
  activity: TradeActivityFeedResult;
  tensorRibbon?: TensorRibbonMetrics | null;
};

/** Partner collection desk — server-loaded listings via listPartnerTradeListings(). */
export function TradePartnerCollectionDesk({
  collection,
  collections,
  collectionSocialLinks,
  listings,
  stats,
  partnerMeta,
  depth,
  listResult,
  activity,
  tensorRibbon,
}: Props) {
  return (
    <TradeCollectionDeskClient
      collection={collection}
      collectionSocialLinks={collectionSocialLinks}
      collections={collections}
      listings={listings}
      stats={stats}
      partnerMeta={partnerMeta}
      depth={depth}
      listResult={listResult}
      activity={activity}
      tensorRibbon={tensorRibbon}
      syntheticActivity={activity.source === "synthetic"}
    />
  );
}
