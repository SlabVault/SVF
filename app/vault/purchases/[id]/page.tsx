import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { MarketplaceOrderStatus } from "@/components/marketplace-order-status";
import { VaultSubNav } from "@/components/vault-sub-nav";
import { buildPageMetadata } from "@/lib/seo";
import { VAULT_ROUTES } from "@/lib/vault-routes";

export const metadata: Metadata = buildPageMetadata({
  title: "Order status",
  description: "Track your SlabVaultFi vault shop purchase and reservation.",
  path: VAULT_ROUTES.purchases,
  noIndex: true,
});

export default async function VaultPurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="page-shell">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Vault", href: VAULT_ROUTES.overview },
          { label: "Purchases", href: VAULT_ROUTES.purchases },
          { label: "Order", href: "#" },
        ]}
      />
      <div className="page-header pb-6">
        <VaultSubNav />
      </div>
      <MarketplaceOrderStatus transactionId={id} />
    </div>
  );
}
