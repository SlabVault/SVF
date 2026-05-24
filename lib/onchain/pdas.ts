/**
 * PDA derivation stubs — align with tensor-foundation IDLs when codegen runs.
 *
 * Seeds below are **documentation placeholders**. Verify against:
 * - tensor-foundation/fees (broker, collection fee accounts)
 * - tensor-foundation/marketplace (list/bid state)
 * - tensor-foundation/escrow
 *
 * @see docs/integrations/onchain-trade-stack.md
 */

import { PublicKey } from "@solana/web3.js";

import {
  getSlabVaultBrokerProgramId,
  TENSOR_PROGRAM_IDS,
} from "@/lib/onchain/program-ids";

/** SlabVault broker config PDA seeds (custom program). */
export const BROKER_CONFIG_SEED = "broker_config";

/**
 * Derive SlabVault `BrokerConfig` PDA (devnet program).
 * Returns null if program id is still the system-program placeholder.
 */
export function findBrokerConfigPda(
  authority: PublicKey,
  programId = new PublicKey(getSlabVaultBrokerProgramId()),
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(BROKER_CONFIG_SEED), authority.toBuffer()],
    programId,
  );
  return pda;
}

/**
 * Tensor Fees program id for fee/broker account metas in transactions.
 */
export function getTensorFeesProgramId(): PublicKey {
  return new PublicKey(TENSOR_PROGRAM_IDS.fees);
}

/**
 * Tensor Marketplace (TCM) program id for list/bid/fill instructions.
 */
export function getTensorMarketplaceProgramId(): PublicKey {
  return new PublicKey(TENSOR_PROGRAM_IDS.marketplaceTcm);
}

/**
 * Placeholder: collection fee PDA under Tensor Fees program.
 * Implement with IDL seeds from tensor-foundation/fees client after IDL pin.
 */
export function findCollectionFeePdaPlaceholder(collectionMint: PublicKey): null {
  void collectionMint;
  return null;
}

/**
 * Placeholder: broker fee account under Tensor Fees program.
 * Phase 1: configure broker pubkey via fees program admin flow on devnet/mainnet.
 */
export function findBrokerFeePdaPlaceholder(brokerPubkey: PublicKey): null {
  void brokerPubkey;
  return null;
}
