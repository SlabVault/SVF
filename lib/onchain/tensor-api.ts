/**
 * Tensor REST API client — optional read shortcut when `TENSOR_API_KEY` is set.
 *
 * MVP primary read path: `lib/partner-listings.ts` (CC scraper, Phygitals ingest, JSON/DB seed).
 * UI layout patterns: https://github.com/tensor-hq/marketplace-nextjs-template (not API routes).
 *
 * @see https://dev.tensor.trade/
 */

import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import {
  getTensorApiBaseUrl,
  getTensorApiKey,
  isTensorReadConfigured,
} from "@/lib/integrations/tensor";
import { resolveTensorCollectionBidTraits } from "@/lib/trade/collection-bids";

export type TensorCollectionStats = {
  collId: string;
  slug: string;
  slugDisplay: string;
  name: string;
  imageUri: string | null;
  numListed: number;
  floorPriceLamports: number | null;
  floorPriceSol: number | null;
  volume24hLamports: number | null;
  volume24hSol: number | null;
  volumeAllLamports: number | null;
  volumeAllSol: number | null;
  sales24h: number | null;
  /** Floor vs 24h-ago floor (%), when Tensor returns floor24h. */
  priceChange24hPct: number | null;
  numMints: number | null;
  pctListed: number | null;
};

export type TensorMintListing = {
  mint: string;
  name: string;
  imageUri: string | null;
  priceLamports: number | null;
  priceSol: number | null;
  rarityRank: number | null;
  attributes: { trait_type: string; value: string }[];
  sellerWallet: string | null;
  listState: string | null;
};

export type TensorListingsPage = {
  listings: TensorMintListing[];
  cursor: string | null;
};

export type TensorSerializedTx = {
  tx?: string;
  txV0?: string;
  blockhash?: string;
  lastValidBlockHeight?: number;
};

export type TensorTxBuildResponse = {
  txs?: TensorSerializedTx[];
  [key: string]: unknown;
};

export type TensorTxType =
  | "LIST"
  | "DELIST"
  | "SALE_BUY_NOW"
  | "SALE_ACCEPT_BID"
  | "PLACE_BID"
  | "CANCEL_BID";

export type TensorCollectionTx = {
  txId: string;
  txType: TensorTxType;
  mint: string;
  name: string;
  priceLamports: number | null;
  priceSol: number | null;
  blockTime: number | null;
  source: string | null;
};

export type TensorCollectionTxHistoryPage = {
  transactions: TensorCollectionTx[];
  cursor: string | null;
};

export type TensorCollectionBid = {
  bidStateAddress: string;
  priceLamports: number | null;
  priceSol: number | null;
  quantity: number | null;
  bidderWallet: string | null;
  blockTime: number | null;
  traitsSummary?: string;
  isTraitBid?: boolean;
};

export type TensorCollectionBidsPage = {
  bids: TensorCollectionBid[];
  cursor: string | null;
};

export type TensorUserBid = {
  bidStateAddress: string;
  mint: string | null;
  collId: string | null;
  name: string;
  priceLamports: number | null;
  priceSol: number | null;
  bidType: "nft" | "collection";
};

export type TensorUserBidsPage = {
  bids: TensorUserBid[];
  cursor: string | null;
};

const LAMPORTS_PER_SOL = 1_000_000_000;

const ACTIVITY_TX_TYPES: TensorTxType[] = [
  "LIST",
  "SALE_BUY_NOW",
  "SALE_ACCEPT_BID",
];

function lamportsToSol(lamports: number | null | undefined): number | null {
  if (lamports == null || !Number.isFinite(lamports)) return null;
  return lamports / LAMPORTS_PER_SOL;
}

function lamportsFieldToSol(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number") return lamportsToSol(value);
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return lamportsToSol(n);
}

function floorChange24hPct(
  currentLamports: number | null,
  floor24hLamports: number | null | undefined,
): number | null {
  if (
    currentLamports == null ||
    floor24hLamports == null ||
    !Number.isFinite(floor24hLamports) ||
    floor24hLamports <= 0
  ) {
    return null;
  }
  return ((currentLamports - floor24hLamports) / floor24hLamports) * 100;
}

function tensorHeaders(): HeadersInit {
  const key = getTensorApiKey();
  if (!key) {
    throw new Error("TENSOR_API_KEY is not configured");
  }
  return {
    accept: "application/json",
    "x-tensor-api-key": key,
  };
}

type TensorQueryValue = string | string[];

async function tensorGet<T>(
  path: string,
  query: Record<string, TensorQueryValue>,
): Promise<T> {
  const base = getTensorApiBaseUrl().replace(/\/$/, "");
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else {
      params.set(key, value);
    }
  }
  const url = `${base}${path}?${params.toString()}`;
  const res = await fetchWithTimeout(url, {
    headers: tensorHeaders(),
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Tensor API ${res.status}: ${body.slice(0, 200)}`);
  }

  return (await res.json()) as T;
}

type TensorCollectionsResponse = {
  collections?: TensorCollectionRow[];
};

type TensorCollectionRow = {
  collId?: string;
  slug?: string;
  slugDisplay?: string;
  name?: string;
  imageUri?: string;
  statsV2?: {
    numListed?: number;
    buyNowPrice?: number;
    floorPrice?: number;
    floor24h?: number;
    volume24h?: number | string;
    volumeAll?: number | string;
    sales24h?: number;
    salesAll?: number;
    numMints?: number;
    pctListed?: number;
  };
};

type TensorMintCollectionResponse = {
  mints?: TensorMintRow[];
  cursor?: string;
};

type TensorMintRow = {
  mint?: string;
  name?: string;
  imageUri?: string;
  owner?: string;
  listing?: {
    price?: number;
    rarityRank?: number;
    seller?: string;
    listState?: string;
  };
  attributes?: { trait_type?: string; value?: string }[];
};

function mapCollectionRow(row: TensorCollectionRow): TensorCollectionStats {
  const floorLamports =
    row.statsV2?.buyNowPrice ?? row.statsV2?.floorPrice ?? null;
  const volume24hLamports =
    typeof row.statsV2?.volume24h === "number"
      ? row.statsV2.volume24h
      : row.statsV2?.volume24h != null
        ? Number(row.statsV2.volume24h)
        : null;
  const volumeAllLamports =
    typeof row.statsV2?.volumeAll === "number"
      ? row.statsV2.volumeAll
      : row.statsV2?.volumeAll != null
        ? Number(row.statsV2.volumeAll)
        : null;

  return {
    collId: row.collId ?? "",
    slug: row.slug ?? "",
    slugDisplay: row.slugDisplay ?? row.slug ?? "",
    name: row.name ?? row.slugDisplay ?? "Collection",
    imageUri: row.imageUri ?? null,
    numListed: row.statsV2?.numListed ?? 0,
    floorPriceLamports: floorLamports,
    floorPriceSol: lamportsToSol(floorLamports),
    volume24hLamports: Number.isFinite(volume24hLamports) ? volume24hLamports : null,
    volume24hSol: lamportsFieldToSol(row.statsV2?.volume24h),
    volumeAllLamports: Number.isFinite(volumeAllLamports) ? volumeAllLamports : null,
    volumeAllSol: lamportsFieldToSol(row.statsV2?.volumeAll),
    sales24h: row.statsV2?.sales24h ?? null,
    priceChange24hPct: floorChange24hPct(floorLamports, row.statsV2?.floor24h),
    numMints: row.statsV2?.numMints ?? null,
    pctListed: row.statsV2?.pctListed ?? null,
  };
}

function mapMintRow(row: TensorMintRow): TensorMintListing | null {
  const mint = row.mint?.trim();
  if (!mint) return null;
  const priceLamports = row.listing?.price ?? null;
  const sellerWallet =
    row.listing?.seller?.trim() || row.owner?.trim() || null;
  return {
    mint,
    name: row.name?.trim() || `${mint.slice(0, 4)}…${mint.slice(-4)}`,
    imageUri: row.imageUri ?? null,
    priceLamports,
    priceSol: lamportsToSol(priceLamports),
    rarityRank: row.listing?.rarityRank ?? null,
    attributes: (row.attributes ?? [])
      .filter((a) => a.trait_type && a.value)
      .map((a) => ({
        trait_type: String(a.trait_type),
        value: String(a.value),
      })),
    sellerWallet,
    listState: row.listing?.listState?.trim() ?? null,
  };
}

type TensorTxQueryParams = Record<string, string>;

async function fetchTensorTxEndpoint(
  path: string,
  params: TensorTxQueryParams,
): Promise<TensorTxBuildResponse> {
  if (!isTensorReadConfigured()) {
    throw new Error("TENSOR_API_KEY is not configured");
  }
  return tensorGet<TensorTxBuildResponse>(path, params);
}

/** Tensor REST buy tx builder — server-side only (requires API key). */
export async function fetchTensorBuyTx(params: {
  buyer: string;
  mint: string;
  owner: string;
  maxPrice: string;
  blockhash: string;
}): Promise<TensorTxBuildResponse> {
  return fetchTensorTxEndpoint("/api/v1/tx/buy", params);
}

/** Tensor REST list tx builder — server-side only (requires API key). */
export async function fetchTensorListTx(params: {
  mint: string;
  owner: string;
  price: string;
  blockhash: string;
  feePayer: string;
}): Promise<TensorTxBuildResponse> {
  return fetchTensorTxEndpoint("/api/v1/tx/list", params);
}

/** Tensor REST delist tx builder — server-side only (requires API key). */
export async function fetchTensorDelistTx(params: {
  mint: string;
  owner: string;
  blockhash: string;
}): Promise<TensorTxBuildResponse> {
  return fetchTensorTxEndpoint("/api/v1/tx/delist", params);
}

/** Tensor REST single-NFT bid tx builder — server-side only (requires API key). */
export async function fetchTensorBidTx(params: {
  owner: string;
  mint: string;
  price: string;
  blockhash: string;
  expireIn?: string;
  makerBroker?: string;
  rentPayer?: string;
}): Promise<TensorTxBuildResponse> {
  return fetchTensorTxEndpoint("/api/v1/tx/bid", params);
}

/** Tensor REST cancel bid tx builder — server-side only (requires API key). */
export async function fetchTensorCancelBidTx(params: {
  bidStateAddress: string;
  blockhash: string;
}): Promise<TensorTxBuildResponse> {
  return fetchTensorTxEndpoint("/api/v1/tx/cancelBid", params);
}

/** Raw collections response for BFF proxy routes. */
export async function fetchTensorCollectionsRaw(
  collectionSlug: string,
): Promise<unknown> {
  if (!isTensorReadConfigured()) {
    throw new Error("TENSOR_API_KEY is not configured");
  }
  return tensorGet<unknown>("/api/v1/collections", {
    slugs: collectionSlug,
    sortBy: "statsV2.volume24h:desc",
    limit: "1",
  });
}

/** Raw mint/collection listings for BFF proxy routes. */
export async function fetchTensorMintCollectionRaw(params: {
  slug: string;
  limit?: string;
  cursor?: string;
  mint?: string;
}): Promise<unknown> {
  if (!isTensorReadConfigured()) {
    throw new Error("TENSOR_API_KEY is not configured");
  }
  const query: Record<string, string> = {
    slug: params.slug,
    sortBy: "ListingPriceAsc",
    limit: params.limit ?? "50",
  };
  if (params.cursor) query.cursor = params.cursor;
  if (params.mint) query.mints = params.mint;
  return tensorGet<unknown>("/api/v1/mint/collection", query);
}

/** Fetch collection stats by Tensor slug (slugDisplay / ME slug). */
export async function fetchTensorCollectionStats(
  collectionSlug: string,
): Promise<TensorCollectionStats | null> {
  if (!isTensorReadConfigured()) return null;

  const data = await tensorGet<TensorCollectionsResponse>("/api/v1/collections", {
    slugs: collectionSlug,
    sortBy: "statsV2.volume24h:desc",
    limit: "1",
  });

  const row = data.collections?.[0];
  return row ? mapCollectionRow(row) : null;
}

/** List active asks for a collection slug (read-only browse). */
export async function fetchTensorCollectionListings(
  collectionSlug: string,
  options?: { limit?: number; cursor?: string },
): Promise<TensorListingsPage> {
  if (!isTensorReadConfigured()) {
    return { listings: [], cursor: null };
  }

  const limit = String(Math.min(250, Math.max(1, options?.limit ?? 48)));
  const query: Record<string, string> = {
    slug: collectionSlug,
    sortBy: "ListingPriceAsc",
    limit,
  };
  if (options?.cursor) query.cursor = options.cursor;

  const data = await tensorGet<TensorMintCollectionResponse>(
    "/api/v1/mint/collection",
    query,
  );

  const listings = (data.mints ?? [])
    .map(mapMintRow)
    .filter((row): row is TensorMintListing => row != null);

  return {
    listings,
    cursor: data.cursor ?? null,
  };
}

type TensorTxHistoryRow = {
  txId?: string;
  tx_id?: string;
  signature?: string;
  txType?: string;
  type?: string;
  mint?: string;
  name?: string;
  mintName?: string;
  price?: number;
  grossAmount?: number;
  amount?: number;
  blockTime?: number;
  txAt?: number;
  source?: string;
};

type TensorTxHistoryResponse = {
  txs?: TensorTxHistoryRow[];
  transactions?: TensorTxHistoryRow[];
  cursor?: string;
};

function mapTxHistoryRow(row: TensorTxHistoryRow): TensorCollectionTx | null {
  const txId = row.txId?.trim() || row.tx_id?.trim() || row.signature?.trim();
  const txType = (row.txType ?? row.type)?.trim().toUpperCase() as TensorTxType | undefined;
  const mint = row.mint?.trim();
  if (!txId || !txType || !mint) return null;

  const priceLamports =
    row.price ?? row.grossAmount ?? row.amount ?? null;
  const blockTime = row.blockTime ?? row.txAt ?? null;
  const name =
    row.name?.trim() ||
    row.mintName?.trim() ||
    `${mint.slice(0, 4)}…${mint.slice(-4)}`;

  return {
    txId,
    txType,
    mint,
    name,
    priceLamports,
    priceSol: lamportsToSol(priceLamports),
    blockTime,
    source: row.source ?? null,
  };
}

type TensorCollectionBidRow = {
  address?: string;
  bidState?: string;
  bidStateAddress?: string;
  bid_address?: string;
  owner?: string;
  bidder?: string;
  buyer?: string;
  price?: number;
  amount?: number;
  grossAmount?: number;
  quantity?: number;
  qty?: number;
  numRemaining?: number;
  remaining?: number;
  maxQty?: number;
  blockTime?: number;
  txAt?: number;
  createdAt?: number;
  timestamp?: number;
  bidType?: string;
  isTraitBid?: boolean;
  traits?: unknown;
  traitFilters?: unknown;
  trait_filters?: unknown;
  filters?: unknown;
  filter?: unknown;
};

type TensorCollectionBidsResponse = {
  bids?: TensorCollectionBidRow[];
  cursor?: string;
};

type TensorUserBidRow = {
  address?: string;
  bidState?: string;
  bidStateAddress?: string;
  bid_address?: string;
  mint?: string;
  mintAddress?: string;
  name?: string;
  nftName?: string;
  collectionName?: string;
  price?: number;
  amount?: number;
  grossAmount?: number;
  collId?: string;
  collectionId?: string;
};

type TensorUserBidsResponse = {
  bids?: TensorUserBidRow[];
  cursor?: string;
};

function mapCollectionBidRow(row: TensorCollectionBidRow): TensorCollectionBid | null {
  const bidStateAddress =
    row.address?.trim() ||
    row.bidState?.trim() ||
    row.bidStateAddress?.trim() ||
    row.bid_address?.trim();
  if (!bidStateAddress) return null;

  const priceLamports = row.price ?? row.amount ?? row.grossAmount ?? null;
  const quantity =
    row.quantity ?? row.qty ?? row.numRemaining ?? row.remaining ?? row.maxQty ?? null;
  const bidderWallet =
    row.owner?.trim() || row.bidder?.trim() || row.buyer?.trim() || null;
  const blockTime = row.blockTime ?? row.txAt ?? row.createdAt ?? row.timestamp ?? null;

  const traitMeta = resolveTensorCollectionBidTraits(row as Record<string, unknown>);

  return {
    bidStateAddress,
    priceLamports,
    priceSol: lamportsToSol(priceLamports),
    quantity: quantity != null && Number.isFinite(quantity) ? quantity : null,
    bidderWallet,
    blockTime,
    ...traitMeta,
  };
}

function mapUserBidRow(
  row: TensorUserBidRow,
  bidType: TensorUserBid["bidType"],
): TensorUserBid | null {
  const bidStateAddress =
    row.address?.trim() ||
    row.bidState?.trim() ||
    row.bidStateAddress?.trim() ||
    row.bid_address?.trim();
  if (!bidStateAddress) return null;

  const mint = row.mint?.trim() || row.mintAddress?.trim() || null;
  const collId = row.collId?.trim() || row.collectionId?.trim() || null;
  const priceLamports = row.price ?? row.amount ?? row.grossAmount ?? null;
  const name =
    row.name?.trim() ||
    row.nftName?.trim() ||
    row.collectionName?.trim() ||
    (mint ? `${mint.slice(0, 4)}…${mint.slice(-4)}` : "Collection bid");

  return {
    bidStateAddress,
    mint,
    collId,
    name,
    priceLamports,
    priceSol: lamportsToSol(priceLamports),
    bidType,
  };
}

/** Raw collection bids for BFF proxy routes. */
export async function fetchTensorCollectionBidsRaw(
  collId: string,
  options?: { limit?: string; cursor?: string },
): Promise<unknown> {
  if (!isTensorReadConfigured()) {
    throw new Error("TENSOR_API_KEY is not configured");
  }
  const query: Record<string, string> = {
    collId,
    limit: options?.limit ?? "50",
  };
  if (options?.cursor) query.cursor = options.cursor;
  return tensorGet<unknown>("/api/v1/collections/collection_bids", query);
}

/** Active collection-wide bids for a Tensor collId (read-only market depth). */
export async function fetchTensorCollectionBids(
  collId: string,
  options?: { limit?: number; cursor?: string },
): Promise<TensorCollectionBidsPage> {
  if (!isTensorReadConfigured()) {
    return { bids: [], cursor: null };
  }

  const limit = String(Math.min(100, Math.max(1, options?.limit ?? 50)));
  const query: Record<string, string> = { collId, limit };
  if (options?.cursor) query.cursor = options.cursor;

  const data = await tensorGet<TensorCollectionBidsResponse>(
    "/api/v1/collections/collection_bids",
    query,
  );

  const bids = (data.bids ?? [])
    .map(mapCollectionBidRow)
    .filter((row): row is TensorCollectionBid => row != null);

  return { bids, cursor: data.cursor ?? null };
}

/** Open NFT bids placed by a wallet — Tensor REST `user/nft_bids`. */
export async function fetchTensorUserNftBids(
  owner: string,
  options?: { limit?: number; collId?: string; cursor?: string },
): Promise<TensorUserBidsPage> {
  if (!isTensorReadConfigured()) {
    return { bids: [], cursor: null };
  }

  const limit = String(Math.min(500, Math.max(1, options?.limit ?? 100)));
  const query: Record<string, string> = { owner, limit };
  if (options?.collId) query.collId = options.collId;
  if (options?.cursor) query.cursor = options.cursor;

  const data = await tensorGet<TensorUserBidsResponse>("/api/v1/user/nft_bids", query);
  const bids = (data.bids ?? [])
    .map((row) => mapUserBidRow(row, "nft"))
    .filter((row): row is TensorUserBid => row != null);

  return { bids, cursor: data.cursor ?? null };
}

/** Open collection bids placed by a wallet — Tensor REST `user/collection_bids`. */
export async function fetchTensorUserCollectionBids(
  owner: string,
  options?: { limit?: number; collId?: string; cursor?: string },
): Promise<TensorUserBidsPage> {
  if (!isTensorReadConfigured()) {
    return { bids: [], cursor: null };
  }

  const limit = String(Math.min(500, Math.max(1, options?.limit ?? 100)));
  const query: Record<string, string> = { owner, limit };
  if (options?.collId) query.collId = options.collId;
  if (options?.cursor) query.cursor = options.cursor;

  const data = await tensorGet<TensorUserBidsResponse>(
    "/api/v1/user/collection_bids",
    query,
  );
  const bids = (data.bids ?? [])
    .map((row) => mapUserBidRow(row, "collection"))
    .filter((row): row is TensorUserBid => row != null);

  return { bids, cursor: data.cursor ?? null };
}

/** NFT + collection bids for a wallet (merged, deduped by bid state address). */
export async function fetchTensorUserOpenBids(
  owner: string,
  options?: { limit?: number; collId?: string; cursor?: string },
): Promise<TensorUserBidsPage> {
  const [nftPage, collPage] = await Promise.all([
    fetchTensorUserNftBids(owner, options),
    fetchTensorUserCollectionBids(owner, options),
  ]);

  const seen = new Set<string>();
  const bids: TensorUserBid[] = [];
  for (const row of [...nftPage.bids, ...collPage.bids]) {
    if (seen.has(row.bidStateAddress)) continue;
    seen.add(row.bidStateAddress);
    bids.push(row);
  }

  return {
    bids,
    cursor: nftPage.cursor ?? collPage.cursor ?? null,
  };
}

/** Recent list/sale events for a collection (by Tensor collId). */
export async function fetchTensorCollectionTxHistory(
  collId: string,
  options?: { limit?: number; cursor?: string; txTypes?: TensorTxType[] },
): Promise<TensorCollectionTxHistoryPage> {
  if (!isTensorReadConfigured()) {
    return { transactions: [], cursor: null };
  }

  const limit = String(Math.min(100, Math.max(1, options?.limit ?? 24)));
  const query: Record<string, TensorQueryValue> = {
    collId,
    limit,
    txTypes: options?.txTypes ?? ACTIVITY_TX_TYPES,
  };
  if (options?.cursor) query.cursor = options.cursor;

  const data = await tensorGet<TensorTxHistoryResponse>(
    "/api/v1/collections/tx_history",
    query,
  );

  const rows = data.txs ?? data.transactions ?? [];
  const transactions = rows
    .map(mapTxHistoryRow)
    .filter((row): row is TensorCollectionTx => row != null);

  return {
    transactions,
    cursor: data.cursor ?? null,
  };
}
