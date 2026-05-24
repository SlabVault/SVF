/**
 * Tensor AMM v2 client stub — pool sweep / instant sell (Phase 3).
 * Program: TAMM6ub33ij1mbetoMyVBLeKY5iP41i4UPUJQGkhfsg
 */

import { Connection, PublicKey, Transaction } from "@solana/web3.js";

import { TENSOR_PROGRAM_IDS } from "@/lib/onchain/program-ids";

export function getAmmProgramId(): PublicKey {
  return new PublicKey(TENSOR_PROGRAM_IDS.amm);
}

export type AmmSweepParams = {
  connection: Connection;
  buyer: PublicKey;
  pool: PublicKey;
  maxPriceLamports: bigint;
};

/** Build pool sweep tx — stub for Phase 3. */
export async function buildAmmSweepTransaction(
  params: AmmSweepParams,
): Promise<Transaction> {
  void params;
  return new Transaction();
}
