import { getTradeCollectionBySlug, type TradePartnerId } from "@/lib/onchain/collections";
import type { TradeListing } from "@/lib/trade-listings";

export function resolveListingPartner(
  listing: TradeListing,
): TradePartnerId | null {
  if (listing.partner) return listing.partner;
  return getTradeCollectionBySlug(listing.collectionId)?.partner ?? null;
}

/** Listed row counts per partner venue — derived from desk listings only. */
export function countListingsByVenue(
  listings: TradeListing[],
): { partner: TradePartnerId; count: number }[] {
  const counts = new Map<TradePartnerId, number>();
  for (const listing of listings) {
    const partner = resolveListingPartner(listing);
    if (!partner) continue;
    counts.set(partner, (counts.get(partner) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([partner, count]) => ({ partner, count }))
    .sort((a, b) => b.count - a.count || a.partner.localeCompare(b.partner));
}

export function countAllListingsVenues(listings: TradeListing[]): {
  venueCount: number;
  venues: TradePartnerId[];
} {
  const venues = new Set<TradePartnerId>();
  for (const listing of listings) {
    const partner = resolveListingPartner(listing);
    if (partner) venues.add(partner);
  }
  return { venueCount: venues.size, venues: [...venues] };
}
