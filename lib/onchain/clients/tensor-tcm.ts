/**
 * Tensor Marketplace (TCM) — Phase 1 reads via REST; Phase 2+ txs via SDK.
 *
 * @see docs/integrations/onchain-trade-stack.md
 * @see tensor-foundation/marketplace-nextjs-template API routes
 */

import { Connection, PublicKey, Transaction } from "@solana/web3.js";

import { searchDasCollectionAssets } from "@/lib/helius-das";
import {
  getTensorCcCollectionSlugs,
  isHeliusDasConfigured,
  isTensorReadConfigured,
  isTensorTradeWriteEnabled,
} from "@/lib/integrations/tensor";
import { TENSOR_PROGRAM_IDS } from "@/lib/onchain/program-ids";
import {
  assertTcmProgramIdsAligned,
  buildSwapDelistTransaction,
  buildSwapFillTransaction,
  buildSwapListTransaction,
  resolveTensorTcmSdkDeps,
} from "@/lib/onchain/clients/tensor-tcm-sdk";
import {
  fetchTensorCollectionListings,
  fetchTensorCollectionStats,
  type TensorCollectionStats,
  type TensorListingsPage,
  type TensorMintListing,
} from "@/lib/onchain/tensor-api";

export type TcmListParams = {
  connection: Connection;
  seller: PublicKey;
  mint: PublicKey;
  priceLamports: bigint;
};

export type TcmFillParams = {
  connection: Connection;
  buyer: PublicKey;
  mint: PublicKey;
  /** List state PDA from Tensor index / tcomp-sdk (optional for TensorSwap single-listing fill). */
  listState?: PublicKey;
  /** Seller when not loading list state from chain. */
  owner?: PublicKey;
  /** Max pay in lamports when not loading amount from list state. */
  maxAmountLamports?: bigint;
};

export type TcmDelistParams = {
  connection: Connection;
  owner: PublicKey;
  mint: PublicKey;
};

export class TensorTradeWriteDisabledError extends Error {
  constructor() {
    super(
      "Tensor trade write path is disabled. Set TENSOR_TRADE_WRITE_ENABLED=true on staging only.",
    );
    this.name = "TensorTradeWriteDisabledError";
  }
}

function assertTensorTradeWriteEnabled(): void {
  if (!isTensorTradeWriteEnabled()) {
    throw new TensorTradeWriteDisabledError();
  }
}

export type CollectionStatsResult = {
  source: "tensor_api" | "helius_das" | "unconfigured";
  stats: TensorCollectionStats | null;
  error?: string;
};

export type ListListingsResult = {
  source: "tensor_api" | "helius_das" | "unconfigured";
  page: TensorListingsPage;
  error?: string;
};

/** Map SlabVault `/trade/c/collector-crypt` to Tensor slug from env. */
export function resolveTensorSlugForCollection(slug: string): string | null {
  if (slug === "collector-crypt") {
    const [first] = getTensorCcCollectionSlugs();
    return first ?? null;
  }
  const configured = getTensorCcCollectionSlugs();
  if (configured.includes(slug)) return slug;
  return null;
}

/**
 * Collection floor + listed count — Tensor API when keyed, else Helius DAS stub.
 */
export async function fetchCollectionStats(
  collectionSlug: string,
  options?: { collectionMint?: string | null },
): Promise<CollectionStatsResult> {
  const tensorSlug = resolveTensorSlugForCollection(collectionSlug) ?? collectionSlug;

  if (isTensorReadConfigured()) {
    try {
      const stats = await fetchTensorCollectionStats(tensorSlug);
      if (stats) {
        return { source: "tensor_api", stats };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!isHeliusDasConfigured() || !options?.collectionMint) {
        return { source: "tensor_api", stats: null, error: message };
      }
    }
  }

  if (isHeliusDasConfigured() && options?.collectionMint) {
    try {
      const assets = await searchDasCollectionAssets(options.collectionMint, 1);
      return {
        source: "helius_das",
        stats: {
          collId: options.collectionMint,
          slug: collectionSlug,
          slugDisplay: collectionSlug,
          name: collectionSlug,
          imageUri: null,
          numListed: assets.length,
          floorPriceLamports: null,
          floorPriceSol: null,
          volume24hLamports: null,
          volume24hSol: null,
          volumeAllLamports: null,
          volumeAllSol: null,
          sales24h: null,
          priceChange24hPct: null,
          numMints: null,
          pctListed: null,
        },
      };
    } catch (err) {
      return {
        source: "helius_das",
        stats: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return { source: "unconfigured", stats: null };
}

/**
 * Active listings for a collection — Tensor API primary; DAS returns assets without asks.
 */
export async function listListings(
  collectionSlug: string,
  options?: {
    limit?: number;
    cursor?: string;
    collectionMint?: string | null;
  },
): Promise<ListListingsResult> {
  const tensorSlug = resolveTensorSlugForCollection(collectionSlug) ?? collectionSlug;

  if (isTensorReadConfigured()) {
    try {
      const page = await fetchTensorCollectionListings(tensorSlug, {
        limit: options?.limit,
        cursor: options?.cursor,
      });
      return { source: "tensor_api", page };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!isHeliusDasConfigured() || !options?.collectionMint) {
        return {
          source: "tensor_api",
          page: { listings: [], cursor: null },
          error: message,
        };
      }
    }
  }

  if (isHeliusDasConfigured() && options?.collectionMint) {
    try {
      const assets = await searchDasCollectionAssets(
        options.collectionMint,
        options?.limit ?? 48,
      );
      const listings: TensorMintListing[] = assets.map((asset) => ({
        mint: asset.mint ?? asset.id,
        name: asset.name,
        imageUri: asset.imageUri,
        priceLamports: asset.priceLamports,
        priceSol: null,
        rarityRank: null,
        attributes: asset.attributes,
        sellerWallet: null,
        listState: null,
      }));
      return {
        source: "helius_das",
        page: { listings, cursor: null },
      };
    } catch (err) {
      return {
        source: "helius_das",
        page: { listings: [], cursor: null },
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return {
    source: "unconfigured",
    page: { listings: [], cursor: null },
  };
}

/**
 * Build list instruction for pNFT fixed ask (TensorSwap SDK single listing).
 * Gated by `TENSOR_TRADE_WRITE_ENABLED` — keep false in production.
 */
export async function buildListTransaction(
  params: TcmListParams,
): Promise<Transaction> {
  assertTensorTradeWriteEnabled();
  assertTcmProgramIdsAligned();

  const deps = await resolveTensorTcmSdkDeps(params.connection);
  return buildSwapListTransaction(deps, params.connection, {
    seller: params.seller,
    mint: params.mint,
    priceLamports: params.priceLamports,
  });
}

/**
 * Build fill (buy) instruction for pNFT ask (TensorSwap `buySingleListing`).
 * Validates TCM `listState` via tcomp-sdk when provided. Gated by env flag.
 */
export async function buildFillTransaction(
  params: TcmFillParams,
): Promise<Transaction> {
  assertTensorTradeWriteEnabled();
  assertTcmProgramIdsAligned();

  const deps = await resolveTensorTcmSdkDeps(params.connection);
  return buildSwapFillTransaction(deps, params.connection, {
    buyer: params.buyer,
    mint: params.mint,
    listState: params.listState,
    owner: params.owner,
    maxAmountLamports: params.maxAmountLamports,
  });
}

/**
 * Build delist instruction for pNFT single listing (TensorSwap SDK).
 * Gated by `TENSOR_TRADE_WRITE_ENABLED` — keep false in production.
 */
export async function buildDelistTransaction(
  params: TcmDelistParams,
): Promise<Transaction> {
  assertTensorTradeWriteEnabled();
  assertTcmProgramIdsAligned();

  const deps = await resolveTensorTcmSdkDeps(params.connection);
  return buildSwapDelistTransaction(deps, params.connection, {
    owner: params.owner,
    mint: params.mint,
  });
}

export function getTcmProgramId(): PublicKey {
  return new PublicKey(TENSOR_PROGRAM_IDS.marketplaceTcm);
}
