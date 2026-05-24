import { NextResponse } from "next/server";

import { getTradeCollectionBySlug } from "@/lib/onchain/collections";
import { getTradeCollectionDepth } from "@/lib/trade/tensor-collection-depth";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
} as const;

/**
 * GET /api/trade/collections/[slug]/depth — BFF for partner + optional Tensor collection depth.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const collection = getTradeCollectionBySlug(slug);

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  if (collection.slug === "slabvault-treasury") {
    return NextResponse.json(
      { error: "Treasury depth is served from vault listings, not Tensor BFF" },
      { status: 400 },
    );
  }

  try {
    const depth = await getTradeCollectionDepth(collection);

    if (depth.error && depth.readConfigured && depth.source !== "partner_ingest") {
      return NextResponse.json(
        {
          error: "Collection depth unavailable",
          message: depth.error,
          depth,
        },
        {
          status: 503,
          headers: {
            ...CACHE_HEADERS,
            "X-Trade-Depth-Source": depth.source,
            "X-Trade-Depth-Configured": String(depth.readConfigured),
          },
        },
      );
    }

    return NextResponse.json(depth, {
      headers: {
        ...CACHE_HEADERS,
        "X-Trade-Depth-Source": depth.source,
        "X-Trade-Depth-Configured": String(depth.readConfigured),
      },
    });
  } catch (error) {
    console.error("Error fetching trade collection depth:", error);
    return NextResponse.json(
      { error: "Failed to fetch collection depth" },
      { status: 500 },
    );
  }
}
