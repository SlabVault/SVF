/**
 * Tensor Foundation + SlabVault program IDs.
 * Mainnet IDs: https://docs.tensor.foundation/protocols
 *
 * @see docs/integrations/onchain-trade-stack.md
 */

export type SolanaCluster = "mainnet-beta" | "devnet" | "localnet";

/** Tensor Foundation — use mainnet IDs in Phase 1 (integrate, do not redeploy). */
export const TENSOR_PROGRAM_IDS = {
  /** Tensor Marketplace Core (TCM) — list, bid, sell, edit. */
  marketplaceTcm: "TCMPhJdwDryooaGtiocG1u3xcYbRpiJzb283XfCZsDp",
  /** Tensor Fees — broker + collection fee PDAs. */
  fees: "TFEEgwDP6nn1s8mMX2tTNPPz8j2VomkphLUmyxKm17A",
  /** Tensor Escrow — shared bid escrow across Tensor protocols. */
  escrow: "TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN",
  /** Tensor Whitelist — collection verification. */
  whitelist: "TL1ST2iRBzuGTqLn1KXnGdSnEow62BzPnGiqyRXhWtW",
  /** Tensor AMM v2 — pool-based NFT liquidity. */
  amm: "TAMM6ub33ij1mbetoMyVBLeKY5iP41i4UPUJQGkhfsg",
} as const;

/** SlabVault custom programs — devnet placeholder until `anchor deploy`. */
export const SLABVAULT_PROGRAM_IDS = {
  /** Optional broker overlay (Phase 2+). Matches programs/Anchor.toml placeholder. */
  broker: "SVFB111111111111111111111111111111111111111",
} as const;

export type TensorProgramKey = keyof typeof TENSOR_PROGRAM_IDS;

export function getTensorProgramId(key: TensorProgramKey): string {
  return TENSOR_PROGRAM_IDS[key];
}

export function getSlabVaultBrokerProgramId(): string {
  return (
    process.env.SLABVAULT_BROKER_PROGRAM_ID?.trim() ||
    SLABVAULT_PROGRAM_IDS.broker
  );
}

export function getOnchainCluster(): SolanaCluster {
  const raw = process.env.SVF_ONCHAIN_CLUSTER?.trim();
  if (raw === "devnet" || raw === "localnet" || raw === "mainnet-beta") {
    return raw;
  }
  return "mainnet-beta";
}

/** Phase 1 default: all settlement via Tensor mainnet programs. */
export function useTensorMainnetPrograms(): boolean {
  return getOnchainCluster() === "mainnet-beta";
}
