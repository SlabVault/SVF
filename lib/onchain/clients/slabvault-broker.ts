/**
 * SlabVault broker program client stub (devnet-only until deployed).
 * Composes with TCM + Tensor Fees for optional interface fee overlay.
 */

import { Connection, PublicKey, Transaction } from "@solana/web3.js";

import { findBrokerConfigPda } from "@/lib/onchain/pdas";
import { getSlabVaultBrokerProgramId } from "@/lib/onchain/program-ids";

export function getBrokerProgramId(): PublicKey {
  return new PublicKey(getSlabVaultBrokerProgramId());
}

export function isBrokerProgramDeployed(): boolean {
  const id = getSlabVaultBrokerProgramId();
  return id !== "SVFB111111111111111111111111111111111111111";
}

export type InitializeBrokerConfigParams = {
  connection: Connection;
  authority: PublicKey;
  treasury: PublicKey;
  maxInterfaceFeeBps: number;
};

/** Initialize broker config on devnet — stub until IDL generated from programs/slabvault-broker. */
export async function buildInitializeBrokerConfigTx(
  params: InitializeBrokerConfigParams,
): Promise<Transaction> {
  const tx = new Transaction();
  void findBrokerConfigPda(params.authority);
  void params;
  return tx;
}
