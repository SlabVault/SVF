import { NextResponse } from "next/server";

import { getTradeCollectionBySlug } from "@/lib/onchain/collections";
import { listMarketplaceSlabs } from "@/lib/marketplace-slabs";
import {
  isPartnerIngestSupported,
  listPartnerTradeListings,
} from "@/lib/partner-listings";
import { getTradeCollectionActivity } from "@/lib/trade/trade-activity";
import { getTradeCollectionDepth } from "@/lib/trade/tensor-collection-depth";
import { mapSlabsToTradeListings, type TradeListing } from "@/lib/trade-listings";

/**
 * GET /api/trade/activity?collection=[slug]&limit=[n]
 * BFF for collection activity — Tensor tx history when keyed, ingest listings else seed preview.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const collectionSlug = searchParams.get("collection")?.trim();

  if (!collectionSlug) {
    return NextResponse.json(
      { error: "Missing required query param: collection" },
      { status: 400 },
    );
  }

  const limitParam = searchParams.get("limit");
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 16;
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(100, Math.max(1, parsedLimit))
    : 16;

  try {
    const collection = getTradeCollectionBySlug(collectionSlug);
    let listings: TradeListing[] = [];
    let seedOnly = false;

    if (collection && isPartnerIngestSupported(collection.partner)) {
      const partnerResult = await listPartnerTradeListings(collection);
      listings = partnerResult.listings;
      seedOnly = partnerResult.fromFallback;
    } else if (collection?.slug === "slabvault-treasury") {
      const listResult = await listMarketplaceSlabs({ status: "AVAILABLE" });
      listings = mapSlabsToTradeListings(listResult.slabs, collectionSlug);
      seedOnly = true;
    } else if (collection) {
      const depth = await getTradeCollectionDepth(collection);
      listings = depth.listings;
      seedOnly = depth.fromFallback === true;
    }

    const activity = await getTradeCollectionActivity(collectionSlug, {
      listings,
      limit,
      seedOnly,
    });

    return NextResponse.json(activity, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        "X-Trade-Activity-Source": activity.source,
      },
    });
  } catch (error) {
    console.error("Error fetching trade activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch trade activity" },
      { status: 500 },
    );
  }
}
