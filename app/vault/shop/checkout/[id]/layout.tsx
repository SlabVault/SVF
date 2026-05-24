import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { VAULT_ROUTES } from "@/lib/vault-routes";

export const metadata: Metadata = buildPageMetadata({
  title: "Checkout",
  description: "Secure checkout flow for SlabVaultFi vault shop listings.",
  path: `${VAULT_ROUTES.shop}/checkout`,
  noIndex: true,
});

export default function VaultShopCheckoutLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
