/** Normalized collection bid row for desk BIDS tab + BFF. */
export type CollectionBidRow = {
  bidStateAddress: string;
  priceSol: number | null;
  quantity: number | null;
  bidderWallet: string | null;
  blockTime: number | null;
  /** Human-readable trait filter summary; "ALL" means collection-wide. */
  traitsSummary?: string;
  /** When true, bid targets specific traits rather than the whole collection. */
  isTraitBid?: boolean;
};

export function isCollectionTraitBid(bid: CollectionBidRow): boolean {
  if (bid.isTraitBid === true) return true;
  const summary = bid.traitsSummary?.trim();
  return summary != null && summary !== "" && summary !== "ALL";
}

function formatTraitPairs(pairs: Array<{ type: string; value: string }>): string {
  return pairs
    .map(({ type, value }) => `${type}: ${value}`)
    .filter((line) => line.length > 2)
    .join(" · ");
}

function traitsRecordToPairs(traits: Record<string, unknown>): Array<{ type: string; value: string }> {
  const pairs: Array<{ type: string; value: string }> = [];
  for (const [type, raw] of Object.entries(traits)) {
    if (raw == null) continue;
    if (Array.isArray(raw)) {
      for (const value of raw) {
        if (typeof value === "string" && value.trim()) {
          pairs.push({ type, value: value.trim() });
        }
      }
      continue;
    }
    if (typeof raw === "string" && raw.trim()) {
      pairs.push({ type, value: raw.trim() });
    }
  }
  return pairs;
}

/** Map Tensor collection_bids row trait fields into desk filter metadata. */
export function resolveTensorCollectionBidTraits(
  row: Record<string, unknown>,
): Pick<CollectionBidRow, "traitsSummary" | "isTraitBid"> {
  const bidType = typeof row.bidType === "string" ? row.bidType.trim().toLowerCase() : "";
  const forceTraitBid =
    row.isTraitBid === true || bidType === "trait" || bidType === "trait_bid";
  if (bidType === "collection" || bidType === "collection_bid") {
    return { traitsSummary: "ALL", isTraitBid: false };
  }

  const traitSources = [
    row.traits,
    row.traitFilters,
    row.trait_filters,
    row.filters,
    row.filter,
  ];

  for (const source of traitSources) {
    if (source == null) continue;

    if (Array.isArray(source)) {
      const pairs = source
        .map((entry) => {
          if (entry == null || typeof entry !== "object") return null;
          const record = entry as Record<string, unknown>;
          const type =
            (typeof record.trait_type === "string" && record.trait_type) ||
            (typeof record.traitType === "string" && record.traitType) ||
            (typeof record.type === "string" && record.type) ||
            "";
          const value = typeof record.value === "string" ? record.value : "";
          if (!type.trim() || !value.trim()) return null;
          return { type: type.trim(), value: value.trim() };
        })
        .filter((pair): pair is { type: string; value: string } => pair != null);
      if (pairs.length > 0) {
        return {
          traitsSummary: formatTraitPairs(pairs),
          isTraitBid: forceTraitBid || true,
        };
      }
      continue;
    }

    if (typeof source === "object") {
      const pairs = traitsRecordToPairs(source as Record<string, unknown>);
      if (pairs.length > 0) {
        return {
          traitsSummary: formatTraitPairs(pairs),
          isTraitBid: forceTraitBid || true,
        };
      }
    }
  }

  if (forceTraitBid) {
    return { isTraitBid: true };
  }

  return { traitsSummary: "ALL", isTraitBid: false };
}

export function filterVisibleCollectionBids(
  bids: CollectionBidRow[],
  hideTraitBids: boolean,
): CollectionBidRow[] {
  if (!hideTraitBids) return bids;
  return bids.filter((bid) => !isCollectionTraitBid(bid));
}

export type CollectionBidsFeedResult = {
  configured: boolean;
  slug: string;
  collId: string | null;
  bids: CollectionBidRow[];
  cursor: string | null;
  error?: string;
};

export function formatCollectionBidWallet(address: string): string {
  const trimmed = address.trim();
  if (trimmed.length < 10) return trimmed;
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}

export function formatCollectionBidTime(blockTime: number | null): string | null {
  if (blockTime == null || !Number.isFinite(blockTime)) return null;
  const ms = blockTime > 1_000_000_000_000 ? blockTime : blockTime * 1000;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatCollectionBidSol(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(4);
}
