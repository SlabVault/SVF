import { NextResponse } from "next/server";

import { resolveTensorSlugForCollection } from "@/lib/onchain/clients/tensor-tcm";
import {
  fetchTensorCollectionStats,
  fetchTensorUserOpenBids,
  type TensorUserBid,
} from "@/lib/onchain/tensor-api";
import { isTensorReadConfigured } from "@/lib/integrations/tensor";
import type { WalletOpenBid } from "@/lib/trade/wallet-bids";

export const runtime = "nodejs";

function mapTensorBidToWallet(row: TensorUserBid): WalletOpenBid {
  return {
    bidStateAddress: row.bidStateAddress,
    mint: row.mint,
    collId: row.collId,
    label: row.name,
    priceSol: row.priceSol ?? 0,
    bidType: row.bidType,
  };
}

/**
 * GET /api/trade/wallet/bids?owner=
 * Read-only open bids for a connected wallet (no write gate).
 *
 * Optional: collId, collectionSlug (resolves Tensor collId for filtering).
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const owner = params.get("owner")?.trim();
  const collIdParam = params.get("collId")?.trim();
  const collectionSlug = params.get("collectionSlug")?.trim();

  if (!owner) {
    return NextResponse.json({ error: "owner query param required" }, { status: 400 });
  }

  if (!isTensorReadConfigured()) {
    return NextResponse.json({
      configured: false,
      bids: [] as WalletOpenBid[],
      cursor: null,
    });
  }

  try {
    let collId = collIdParam ?? null;
    if (!collId && collectionSlug) {
      const tensorSlug = resolveTensorSlugForCollection(collectionSlug);
      if (tensorSlug) {
        const stats = await fetchTensorCollectionStats(tensorSlug);
        collId = stats?.collId ?? null;
      }
    }

    const page = await fetchTensorUserOpenBids(owner, {
      limit: 100,
      collId: collId ?? undefined,
    });

    return NextResponse.json({
      configured: true,
      bids: page.bids.map(mapTensorBidToWallet),
      cursor: page.cursor,
    });
  } catch (error) {
    console.error("Wallet bids fetch failed:", error);
    return NextResponse.json(
      {
        configured: true,
        bids: [] as WalletOpenBid[],
        cursor: null,
        error: "fetch_failed",
      },
      { status: 502 },
    );
  }
}
