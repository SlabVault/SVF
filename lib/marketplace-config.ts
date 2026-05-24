/** Treasury multisig — receives SOL + SVF payments (Squads). */
export const DEFAULT_TREASURY_WALLET =
  "2oRZe7z9Jx3rpoUWuidjGhpX9mxxhtps2JqQtdxLfHwg";

/** Deployer vault wallet (SNS: slabvault.sol) — fulfills slab transfers. */
export const DEFAULT_DEPLOYER_WALLET =
  "CWqc6DQhHxdnDSwrjG3LGnyWPQ3dRNfCY5umvTj8NBE3";

/** $SVF token mint from data/site.json. */
export const DEFAULT_SVF_TOKEN_MINT =
  "6ZxRa2CWtAcWKb58RMJABuiUYWu9o4oM76QCyMVLpump";

export function getTreasuryWalletAddress(): string {
  return (
    process.env.TREASURY_WALLET_ADDRESS?.trim() ||
    process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS?.trim() ||
    DEFAULT_TREASURY_WALLET
  );
}

export function getDeployerWalletAddress(): string {
  return (
    process.env.DEPLOYER_WALLET_ADDRESS?.trim() ||
    process.env.NEXT_PUBLIC_DEPLOYER_WALLET_ADDRESS?.trim() ||
    DEFAULT_DEPLOYER_WALLET
  );
}

export function getSvfTokenMint(): string {
  return (
    process.env.SVF_TOKEN_MINT?.trim() ||
    process.env.NEXT_PUBLIC_SVF_TOKEN_MINT?.trim() ||
    DEFAULT_SVF_TOKEN_MINT
  );
}

import { getSolanaRpcUrl } from "@/lib/solana-config";

export { getSolanaRpcUrl };

export function isAutoFulfillmentEnabled(): boolean {
  return Boolean(process.env.SERVER_WALLET_SECRET?.trim());
}

/** Public payment config exposed to the checkout client. */
export function getMarketplacePaymentConfig() {
  return {
    treasuryWallet: getTreasuryWalletAddress(),
    deployerWallet: getDeployerWalletAddress(),
    svfTokenMint: getSvfTokenMint(),
    rpcUrl: getSolanaRpcUrl(),
    autoFulfillmentEnabled: isAutoFulfillmentEnabled(),
  };
}

/** Build lamports for client-side SOL transfer. */
export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}
