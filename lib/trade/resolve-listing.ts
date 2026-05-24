import { getTradeCollectionBySlug } from "@/lib/onchain/collections";
import { listMarketplaceSlabs } from "@/lib/marketplace-slabs";
import { isPartnerIngestSupported, listPartnerTradeListings } from "@/lib/partner-listings";
import {
  mapSlabsToTradeListings,
  type TradeListing,
} from "@/lib/trade-listings";
import { extractCertNumber } from "@/lib/trade/extract-cert-number";

export { extractCertNumber } from "@/lib/trade/extract-cert-number";

function matchesCertOrMint(listing: TradeListing, certOrMint: string): boolean {
  if (listing.id === certOrMint) return true;
  const cert = extractCertNumber(listing);
  if (cert && cert === certOrMint.replace(/^#/, "")) return true;
  return false;
}

/** Resolve a slab listing by mint address or PSA/cert number. */
export async function resolveTradeListing(
  certOrMint: string,
  collectionSlug: string,
): Promise<TradeListing | null> {
  const collection = getTradeCollectionBySlug(collectionSlug);
  if (!collection) return null;

  if (collection.slug === "slabvault-treasury") {
    const listResult = await listMarketplaceSlabs({ status: "AVAILABLE" });
    const listings = mapSlabsToTradeListings(listResult.slabs, collection.slug);
    return listings.find((row) => matchesCertOrMint(row, certOrMint)) ?? null;
  }

  if (isPartnerIngestSupported(collection.partner)) {
    const partner = await listPartnerTradeListings(collection);
    return partner.listings.find((row) => matchesCertOrMint(row, certOrMint)) ?? null;
  }

  return null;
}
