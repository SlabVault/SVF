import { NextResponse } from "next/server";

import { loadAllTradeListings } from "@/lib/trade/all-listings";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
} as const;

/**
 * GET /api/trade/all/listings
 * Aggregate merged listings across partner venues — no Tensor API key required.
 */
export async function GET(_request: Request) {
  const result = await loadAllTradeListings();

  return NextResponse.json(
    {
      source: "all_listings" as const,
      listings: result.listings,
      stats: result.stats,
      venueCount: result.venueCount,
      venues: result.venues,
      fromFallback: result.fromFallback,
      readConfigured: result.listings.length > 0,
    },
    {
      headers: {
        ...CACHE_HEADERS,
        "X-Trade-All-Source": "partner_ingest_aggregate",
      },
    },
  );
}
