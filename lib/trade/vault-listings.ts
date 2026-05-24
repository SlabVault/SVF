import { getDeployerWalletAddress } from "@/lib/marketplace-config";

/** Collection slug for treasury slabs on `/trade`. */
export const VAULT_TREASURY_COLLECTION_SLUG = "slabvault-treasury";

/** Returns true when the seller wallet is the SlabVault deployer / vault custodian. */
export function isVaultSellerWallet(sellerWallet: string): boolean {
  return sellerWallet === getDeployerWalletAddress();
}

export type VaultListParams = {
  mint: string;
  priceLamports: bigint;
  sellerWallet?: string;
  expiresAt?: Date;
};

export type VaultListTxResult = {
  /** Base64 serialized transaction — populate when TCM client is wired. */
  transaction: string | null;
  error?: string;
};

/**
 * Build a TCM list transaction for a vault-held pNFT.
 * Stub — wire @tensor-foundation/marketplace client in Phase 1 slice 4.
 */
export async function buildVaultListTx(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub params for Phase 1 TCM wiring
  _params: VaultListParams,
): Promise<VaultListTxResult> {
  return {
    transaction: null,
    error: "Vault list tx builder not implemented — use TCM SDK spike first",
  };
}

/**
 * Build a TCM delist transaction for an active vault ask.
 * Stub — wire @tensor-foundation/marketplace client in Phase 1 slice 4.
 */
export async function buildVaultDelistTx(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub params for Phase 1 TCM wiring
  _params: { mint: string; sellerWallet?: string },
): Promise<VaultListTxResult> {
  return {
    transaction: null,
    error: "Vault delist tx builder not implemented — use TCM SDK spike first",
  };
}
