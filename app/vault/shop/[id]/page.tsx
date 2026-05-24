import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { SlabDetailClient } from "@/components/slab-detail-client";
import { buildPageMetadata } from "@/lib/seo";
import { getMarketplaceSlabById } from "@/lib/marketplace-slabs";
import { VAULT_ROUTES } from "@/lib/vault-routes";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = rawId.trim();

  if (!id) {
    return buildPageMetadata({
      title: "Vault Shop Listing",
      description: "Listing details for a SlabVaultFi vault shop slab.",
      path: VAULT_ROUTES.shop,
    });
  }

  const slab = await getMarketplaceSlabById(id);
  if (!slab) {
    return buildPageMetadata({
      title: "Listing not found",
      description: "This vault shop listing is unavailable.",
      path: VAULT_ROUTES.shop,
      noIndex: true,
    });
  }

  return buildPageMetadata({
    title: `${slab.name} ${slab.grade}`,
    description: `Vault shop listing for ${slab.name} (${slab.grade}) in the SlabVaultFi vault.`,
    path: VAULT_ROUTES.shopListing(slab.id),
    keywords: ["slab listing", slab.name, slab.grade],
    imageAlt: `${slab.name} ${slab.grade} listing`,
  });
}

export default async function VaultShopListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = rawId.trim();
  if (!id) {
    notFound();
  }

  const slab = await getMarketplaceSlabById(id);

  if (!slab) {
    notFound();
  }

  return (
    <div className="page-shell">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Vault", href: VAULT_ROUTES.overview },
          { label: "Shop", href: VAULT_ROUTES.shop },
          { label: slab.name, href: VAULT_ROUTES.shopListing(slab.id) },
        ]}
      />
      <SlabDetailClient slab={slab} />
    </div>
  );
}
