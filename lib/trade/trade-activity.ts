import { resolveTensorSlugForCollection } from "@/lib/onchain/clients/tensor-tcm";
import {
  fetchTensorCollectionStats,
  fetchTensorCollectionTxHistory,
  type TensorCollectionTx,
} from "@/lib/onchain/tensor-api";
import { isTensorReadConfigured } from "@/lib/integrations/tensor";
import {
  buildStubTradeActivityFeed,
  type TradeActivityEvent,
  type TradeActivityType,
  type TradeListing,
} from "@/lib/trade-listings";

export type TradeActivityFeedSource =
  | "tensor_api"
  | "ingest"
  | "synthetic"
  | "unconfigured";

export type TradeActivityFeedResult = {
  source: TradeActivityFeedSource;
  events: TradeActivityEvent[];
  fetchedAt: string;
  cursor: string | null;
  error?: string;
};

const SALE_TX_TYPES = new Set(["SALE_BUY_NOW", "SALE_ACCEPT_BID"]);
const BID_TX_TYPES = new Set(["PLACE_BID"]);
const CANCEL_TX_TYPES = new Set(["DELIST", "CANCEL_BID"]);

function mapTensorTxType(txType: string): TradeActivityType {
  if (txType === "LIST") return "list";
  if (SALE_TX_TYPES.has(txType)) return "sale";
  if (BID_TX_TYPES.has(txType)) return "bid";
  if (CANCEL_TX_TYPES.has(txType)) return "cancel";
  return "list";
}

function txLabel(type: TradeActivityType): string {
  switch (type) {
    case "list":
      return "Listed";
    case "sale":
      return "Sold";
    case "bid":
      return "Bid placed";
    case "cancel":
      return "Cancelled";
  }
}

function blockTimeToIso(blockTime: number | null): string {
  if (blockTime == null || !Number.isFinite(blockTime)) {
    return new Date().toISOString();
  }
  const ms = blockTime > 1_000_000_000_000 ? blockTime : blockTime * 1000;
  return new Date(ms).toISOString();
}

export function mapTensorTxToTradeActivityEvent(
  tx: TensorCollectionTx,
): TradeActivityEvent {
  const type = mapTensorTxType(tx.txType);
  return {
    id: `${tx.txType}-${tx.txId}-${tx.mint}`,
    type,
    slabId: tx.mint,
    slabName: tx.name,
    amountSol: tx.priceSol,
    timestamp: blockTimeToIso(tx.blockTime),
    label: txLabel(type),
  };
}

export function buildSyntheticTradeActivityFeed(
  listings: TradeListing[],
  limit = 12,
): TradeActivityEvent[] {
  return buildStubTradeActivityFeed(listings, limit);
}

/** Server-side activity loader — Tensor tx history when keyed, else listing-derived rows. */
export async function getTradeCollectionActivity(
  collectionSlug: string,
  options?: {
    listings?: TradeListing[];
    limit?: number;
    collId?: string | null;
    /** When true, listing-derived rows are seed-only preview (JSON fallback). */
    seedOnly?: boolean;
  },
): Promise<TradeActivityFeedResult> {
  const limit = options?.limit ?? 16;
  const listings = options?.listings ?? [];
  const fetchedAt = new Date().toISOString();

  const listingDerivedFallback = (): TradeActivityFeedResult => {
    if (listings.length === 0) {
      return {
        source: "unconfigured",
        events: [],
        fetchedAt,
        cursor: null,
      };
    }

    return {
      source: options?.seedOnly ? "synthetic" : "ingest",
      events: buildSyntheticTradeActivityFeed(listings, limit),
      fetchedAt,
      cursor: null,
    };
  };

  if (!isTensorReadConfigured()) {
    return listingDerivedFallback();
  }

  const tensorSlug = resolveTensorSlugForCollection(collectionSlug);
  if (!tensorSlug && collectionSlug !== "slabvault-treasury") {
    return listingDerivedFallback();
  }

  try {
    let collId = options?.collId?.trim() || null;
    if (!collId && tensorSlug) {
      const stats = await fetchTensorCollectionStats(tensorSlug);
      collId = stats?.collId ?? null;
    }

    if (!collId) {
      return listingDerivedFallback();
    }

    const page = await fetchTensorCollectionTxHistory(collId, { limit });
    const events = page.transactions.map(mapTensorTxToTradeActivityEvent);

    if (events.length === 0) {
      return listingDerivedFallback();
    }

    return {
      source: "tensor_api",
      events,
      fetchedAt,
      cursor: page.cursor,
    };
  } catch (err) {
    const fallback = listingDerivedFallback();
    return {
      ...fallback,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
