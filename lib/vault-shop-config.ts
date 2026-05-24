/**
 * Public vault shop UI (`/vault/shop`, legacy `/marketplace/*`) is archived.
 * Routes redirect to `/trade`; checkout APIs and admin flows are unchanged.
 */
export const VAULT_SHOP_PUBLIC_ARCHIVED = true;

export function isVaultShopPublicArchived(): boolean {
  return VAULT_SHOP_PUBLIC_ARCHIVED;
}
