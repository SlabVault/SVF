/**
 * Tensor Escrow program stub — bid escrow shared across Tensor protocols.
 * Program: TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN
 */

import { PublicKey } from "@solana/web3.js";

import { TENSOR_PROGRAM_IDS } from "@/lib/onchain/program-ids";

export function getEscrowProgramId(): PublicKey {
  return new PublicKey(TENSOR_PROGRAM_IDS.escrow);
}

/** Escrow account metas for open bids — implement from escrow IDL. */
export type EscrowBidAccounts = {
  escrowProgram: PublicKey;
  /** PDA holding bid SOL */
  escrowTokenAccount: PublicKey | null;
};

export function stubEscrowBidAccounts(): EscrowBidAccounts {
  return {
    escrowProgram: getEscrowProgramId(),
    escrowTokenAccount: null,
  };
}
