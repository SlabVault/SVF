import type { TradeGridDensity } from "@/lib/trade/grid-density";
import type { TradeListing } from "@/lib/trade-listings";

import { TradeListingGrid } from "../trade-listing-grid";

type Props = {
  listings: TradeListing[];
  collectionSlug: string;
  className?: string;
  gridDensity?: TradeGridDensity;
  floorSol?: number | null;
  onInstantSell?: () => void;
  onAllBids?: () => void;
};

/** @deprecated Prefer {@link TradeListingGrid} — vendor template alias. */
export function TensorListingGrid(props: Props) {
  return <TradeListingGrid {...props} />;
}
