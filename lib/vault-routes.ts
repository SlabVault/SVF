/**
 * Vault route helpers. Public shop/purchases UI is archived (redirects to /trade);
 * paths remain for admin fulfillment links and checkout code.
 */
export const VAULT_ROUTES = {
  overview: "/vault",
  shop: "/vault/shop",
  shopListing: (id: string) => `/vault/shop/${id}`,
  shopCheckout: (id: string) => `/vault/shop/checkout/${id}`,
  purchases: "/vault/purchases",
  purchaseOrder: (id: string) => `/vault/purchases/${id}`,
  proof: "/vault/proof",
} as const;
