import {
  TRADE_GRID_DENSITY_CLASS,
  type TradeGridDensity,
} from "@/lib/trade/grid-density";
import type { TradeListing } from "@/lib/trade-listings";
import { cn } from "@/lib/utils";

import { TradeInstantSellTile } from "./trade-instant-sell-tile";
import { TensorNftCardFromListing } from "./tensor/nft-card";

type Props = {
  listings: TradeListing[];
  collectionSlug: string;
  className?: string;
  gridDensity?: TradeGridDensity;
  floorSol?: number | null;
  onInstantSell?: () => void;
  onAllBids?: () => void;
};

/** Indexer-backed listing grid — s/m/l density maps to xl column count via {@link TRADE_GRID_DENSITY_CLASS}. */
export function TradeListingGrid({
  listings,
  collectionSlug,
  className,
  gridDensity = "m",
  floorSol = null,
  onInstantSell,
  onAllBids,
}: Props) {
  const gridClass = TRADE_GRID_DENSITY_CLASS[gridDensity];

  return (
    <div className={cn(gridClass, className)}>
      {floorSol != null && onInstantSell ? (
        <TradeInstantSellTile
          floorSol={floorSol}
          onSell={onInstantSell}
          onAllBids={onAllBids}
        />
      ) : null}
      {listings.map((listing, index) => (
        <TensorNftCardFromListing
          key={listing.id}
          listing={listing}
          collectionSlug={collectionSlug}
          priority={index < 8}
          rank={index + 1}
        />
      ))}
    </div>
  );
}
