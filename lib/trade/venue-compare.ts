import type { TradePartnerId } from "@/lib/onchain/collections";
import type { TradeListing } from "@/lib/trade-listings";

export type VenueCompareRow = {
  partner: TradePartnerId;
  askSol: number;
  collectionId: string;
};

/** Primary + alternate venue asks for the same cert/mint — sorted low → high. */
export function buildVenueCompareRows(listing: TradeListing): VenueCompareRow[] {
  const byPartner = new Map<TradePartnerId, VenueCompareRow>();

  const add = (row: VenueCompareRow) => {
    if (row.askSol <= 0) return;
    const prev = byPartner.get(row.partner);
    if (!prev || row.askSol < prev.askSol) {
      byPartner.set(row.partner, row);
    }
  };

  if (listing.partner) {
    add({
      partner: listing.partner,
      askSol: listing.askSol,
      collectionId: listing.collectionId,
    });
  }

  for (const alt of listing.alternateVenueAsks ?? []) {
    add(alt);
  }

  return [...byPartner.values()].sort((a, b) => a.askSol - b.askSol);
}
