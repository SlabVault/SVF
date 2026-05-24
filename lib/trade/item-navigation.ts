import { extractCertNumber } from "@/lib/trade/extract-cert-number";
import { sortTradeListings, type TradeListing } from "@/lib/trade-listings";
import { TRADE_ROUTES } from "@/lib/trade-routes";

export type TradeItemAdjacentLinks = {
  prevHref: string | null;
  nextHref: string | null;
  index: number;
  total: number;
};

export function tradeListingItemKey(listing: TradeListing): string {
  return extractCertNumber(listing) ?? listing.id;
}

export function buildTradeItemHref(
  listing: TradeListing,
  collectionSlug: string,
): string {
  const key = tradeListingItemKey(listing);
  return `${TRADE_ROUTES.slab(key)}?collection=${encodeURIComponent(collectionSlug)}`;
}

/** Adjacent item links in default desk order (price low → high). */
export function getTradeItemAdjacentLinks(
  listings: TradeListing[],
  current: TradeListing,
  collectionSlug: string,
): TradeItemAdjacentLinks {
  const sorted = sortTradeListings(listings, "price_asc");
  const currentKey = tradeListingItemKey(current);
  const index = sorted.findIndex(
    (row) =>
      row.id === current.id ||
      tradeListingItemKey(row) === currentKey,
  );

  if (index < 0) {
    return { prevHref: null, nextHref: null, index: -1, total: sorted.length };
  }

  const prev = index > 0 ? sorted[index - 1] : null;
  const next = index < sorted.length - 1 ? sorted[index + 1] : null;

  return {
    prevHref: prev ? buildTradeItemHref(prev, collectionSlug) : null,
    nextHref: next ? buildTradeItemHref(next, collectionSlug) : null,
    index,
    total: sorted.length,
  };
}
