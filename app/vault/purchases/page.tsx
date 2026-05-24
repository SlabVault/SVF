import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { MarketplacePurchasesClient } from "@/components/marketplace-purchases-client";
import { VaultSubNav } from "@/components/vault-sub-nav";
import { WalletButton } from "@/components/wallet-button";
import { buildPageMetadata } from "@/lib/seo";
import { isRwaTradeEnabled } from "@/lib/trade-config";
import { TRADE_ROUTES } from "@/lib/trade-routes";
import { VAULT_ROUTES } from "@/lib/vault-routes";

export const metadata: Metadata = buildPageMetadata({
  title: "My purchases",
  description:
    "View your SlabVaultFi vault shop orders, reservations, and fulfillment status.",
  path: VAULT_ROUTES.purchases,
  noIndex: true,
});

export default function VaultPurchasesPage() {
  if (isRwaTradeEnabled()) {
    redirect(`${TRADE_ROUTES.portfolio}?from=vault-purchases`);
  }

  return (
    <div className="page-shell">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Vault", href: VAULT_ROUTES.overview },
          { label: "Purchases", href: VAULT_ROUTES.purchases },
        ]}
      />

      <div className="page-header space-y-4">
        <VaultSubNav />
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4 pb-8">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            My purchases
          </h1>
          <p className="max-w-prose text-muted">
            Track reservations, payments, and fulfillment for slabs you bought from
            the vault shop.
          </p>
        </div>
        <WalletButton />
      </header>

      <MarketplacePurchasesClient />
    </div>
  );
}
