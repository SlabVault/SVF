import { permanentRedirect } from "next/navigation";

import { TRADE_ROUTES } from "@/lib/trade-routes";

/** Legacy route — public checkout archived; trade desk is canonical. */
export default function LegacyMarketplaceCheckoutPage() {
  permanentRedirect(`${TRADE_ROUTES.landing}?from=marketplace`);
}
