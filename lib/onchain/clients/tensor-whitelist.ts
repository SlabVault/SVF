/**
 * Tensor Whitelist program stub — collection verification for /trade collections.
 * Program: TL1ST2iRBzuGTqLn1KXnGdSnEow62BzPnGiqyRXhWtW
 */

import { PublicKey } from "@solana/web3.js";

import type { TradeCollectionConfig } from "@/lib/onchain/collections";
import { TENSOR_PROGRAM_IDS } from "@/lib/onchain/program-ids";

export function getWhitelistProgramId(): PublicKey {
  return new PublicKey(TENSOR_PROGRAM_IDS.whitelist);
}

export function isCollectionWhitelistedOnChain(
  config: TradeCollectionConfig,
): boolean {
  return config.whitelistOnTensor && config.collectionMint != null;
}

/**
 * Check whitelist proof on-chain — stub returns config flag until RPC parse ships.
 */
export async function fetchWhitelistStatus(
  _connection: unknown,
  config: TradeCollectionConfig,
): Promise<{ whitelisted: boolean; collectionMint: string | null }> {
  return {
    whitelisted: config.whitelistOnTensor,
    collectionMint: config.collectionMint,
  };
}
