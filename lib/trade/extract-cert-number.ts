import type { TradeListing } from "@/lib/trade-listings";

export function extractCertNumber(listing: TradeListing): string | null {
  const fromName = listing.name.match(/#(\d{6,})/);
  if (fromName?.[1]) return fromName[1];
  return null;
}
