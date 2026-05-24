import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

import {
  isHeliusDasConfigured,
  searchDasWalletAssets,
} from "@/lib/helius-das";
import { RPC_WALLET_NFTS_CACHE_TTL_SEC } from "@/lib/rpc-cache";
import {
  enrichPortfolioEstValues,
  mapDasToPortfolioNft,
  type PortfolioNft,
} from "@/lib/trade/portfolio";
import { getTradeLandingCollections } from "@/lib/trade-landing";

const WALLET_NFTS_HTTP_MAX_AGE_SEC = 60;

async function fetchWalletNftsForOwner(owner: string): Promise<PortfolioNft[]> {
  const assets = await searchDasWalletAssets(owner);
  const items = assets.map(mapDasToPortfolioNft);
  return enrichPortfolioEstValues(items, getTradeLandingCollections());
}

function getCachedWalletNfts(owner: string) {
  return unstable_cache(
    () => fetchWalletNftsForOwner(owner),
    ["trade-wallet-nfts", owner],
    { revalidate: RPC_WALLET_NFTS_CACHE_TTL_SEC },
  )();
}

export async function GET(request: Request) {
  const owner = new URL(request.url).searchParams.get("owner")?.trim();

  if (!owner) {
    return NextResponse.json({ error: "owner query param required" }, { status: 400 });
  }

  if (!isHeliusDasConfigured()) {
    return NextResponse.json({
      configured: false,
      items: [] as PortfolioNft[],
    });
  }

  try {
    const items = await getCachedWalletNfts(owner);
    return NextResponse.json(
      { configured: true, items },
      {
        headers: {
          "Cache-Control": `private, max-age=${WALLET_NFTS_HTTP_MAX_AGE_SEC}`,
        },
      },
    );
  } catch (error) {
    console.error("Wallet NFT fetch failed:", error);
    return NextResponse.json(
      { configured: true, items: [], error: "fetch_failed" },
      { status: 502 },
    );
  }
}
