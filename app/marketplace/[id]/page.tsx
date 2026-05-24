import { permanentRedirect } from "next/navigation";

import { TRADE_ROUTES } from "@/lib/trade-routes";

/** Legacy route — public shop archived; trade desk is canonical. */
export default function LegacyMarketplaceListingPage() {
  permanentRedirect(`${TRADE_ROUTES.landing}?from=marketplace`);
}
