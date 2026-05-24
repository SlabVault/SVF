import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  fetchPartnerIngestListingsForPlatform,
  getSupportedPartnerPlatformParams,
} from "@/lib/partner-ingest-adapter";
import { requireSyncAuth } from "@/lib/sync-auth";

type RouteContext = {
  params: Promise<{ platform: string }>;
};

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
} as const;

/**
 * GET /api/trade/partners/[platform]/listings
 * Platforms: collector_crypt (alias collector-crypt), phygitals.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { platform } = await context.params;
  const url = new URL(request.url);
  const includeLiveScrape = url.searchParams.get("live") === "1";
  if (includeLiveScrape && process.env.NODE_ENV === "production") {
    const authError = await requireSyncAuth(request);
    if (authError) return authError;
  }

  const result = await fetchPartnerIngestListingsForPlatform(platform, {
    includeLiveScrape,
  });

  if (!result) {
    return NextResponse.json(
      {
        error: "Unsupported partner platform",
        supported: getSupportedPartnerPlatformParams(),
      },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      source: "partner_ingest" as const,
      platform: result.platform,
      slug: result.slug,
      listings: result.listings,
      stats: result.stats,
      fromFallback: result.fromFallback,
      dbStatus: result.dbStatus,
      sources: result.sources,
      readConfigured: result.listings.length > 0,
    },
    {
      headers: {
        ...CACHE_HEADERS,
        "X-Trade-Partner-Source": "partner_ingest",
        "X-Trade-Partner-Platform": result.platform,
      },
    },
  );
}
