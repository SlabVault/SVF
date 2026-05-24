import type { Metadata } from "next";

import { MarketplaceClient } from "@/components/marketplace-client";
import { listMarketplaceSlabs } from "@/lib/marketplace-slabs";
import { buildPageMetadata } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config";
import { VAULT_ROUTES } from "@/lib/vault-routes";

export const metadata: Metadata = buildPageMetadata({
  title: "Vault Shop",
  description:
    "Browse graded slabs from the SlabVaultFi vault and checkout with SOL + SVF split payments.",
  path: VAULT_ROUTES.shop,
  keywords: ["vault shop", "buy slabs", "SOL SVF checkout"],
});

/** Always read DB/JSON at request time — avoids stale empty listings from static build. */
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function VaultShopPage({ searchParams }: PageProps) {
  const { status: statusParam } = await searchParams;
  const statusFilter =
    statusParam?.toUpperCase() === "SOLD" ? "SOLD" : "AVAILABLE";

  const site = getSiteConfig();
  const listResult = await listMarketplaceSlabs({ status: statusFilter });

  return (
    <MarketplaceClient
      site={site}
      statusFilter={statusFilter}
      listResult={listResult}
    />
  );
}
