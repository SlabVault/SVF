import { permanentRedirect } from "next/navigation";

import { TRADE_ROUTES } from "@/lib/trade-routes";

/** Legacy route — purchases live at /trade/portfolio. */
export default function MarketplaceOrdersPage() {
  permanentRedirect(`${TRADE_ROUTES.portfolio}?from=vault-purchases`);
}
