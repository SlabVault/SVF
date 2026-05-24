import { permanentRedirect } from "next/navigation";

import { TRADE_ROUTES } from "@/lib/trade-routes";

/** Legacy route — order status lives at /trade/portfolio. */
export default function LegacyMarketplaceOrderPage() {
  permanentRedirect(`${TRADE_ROUTES.portfolio}?from=vault-purchases`);
}
