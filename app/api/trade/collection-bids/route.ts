import { NextResponse } from "next/server";

import { resolveTensorSlugForCollection } from "@/lib/onchain/clients/tensor-tcm";
import {
  fetchTensorCollectionBids,
  fetchTensorCollectionStats,
} from "@/lib/onchain/tensor-api";
import { isTensorReadConfigured } from "@/lib/integrations/tensor";
import type { CollectionBidRow } from "@/lib/trade/collection-bids";

export const runtime = "nodejs";

function mapBidRow(
  row: Awaited<ReturnType<typeof fetchTensorCollectionBids>>["bids"][number],
): CollectionBidRow {
  return {
    bidStateAddress: row.bidStateAddress,
    priceSol: row.priceSol,
    quantity: row.quantity,
    bidderWallet: row.bidderWallet,
    blockTime: row.blockTime,
    traitsSummary: row.traitsSummary,
    isTraitBid: row.isTraitBid,
  };
}

/**
 * GET /api/trade/collection-bids?slug=
 * Read-only Tensor collection bid ladder proxy (resolves slug → collId).
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const slug = params.get("slug")?.trim();
  const limitParam = params.get("limit");
  const cursor = params.get("cursor")?.trim();

  if (!slug) {
    return NextResponse.json({ error: "slug query param is required." }, { status: 400 });
  }

  if (!isTensorReadConfigured()) {
    return NextResponse.json({
      configured: false,
      slug,
      collId: null,
      bids: [] as CollectionBidRow[],
      cursor: null,
    });
  }

  try {
    const tensorSlug = resolveTensorSlugForCollection(slug) ?? slug;
    const stats = await fetchTensorCollectionStats(tensorSlug);
    const collId = stats?.collId;

    if (!collId) {
      return NextResponse.json({
        configured: true,
        slug,
        collId: null,
        bids: [] as CollectionBidRow[],
        cursor: null,
      });
    }

    const limit = limitParam ? Number(limitParam) : 50;
    const page = await fetchTensorCollectionBids(collId, {
      limit: Number.isFinite(limit) ? limit : 50,
      cursor,
    });

    return NextResponse.json({
      configured: true,
      slug,
      collId,
      bids: page.bids.map(mapBidRow),
      cursor: page.cursor,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Collection bids failed.";
    const status = message.includes("TENSOR_API_KEY") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
