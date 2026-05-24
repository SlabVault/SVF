/**
 * Fee routing helpers — Tensor Fees program + SVF treasury broker share.
 *
 * @see docs/integrations/onchain-trade-stack.md
 */

import site from "@/data/site.json";
import { TENSOR_PROGRAM_IDS } from "@/lib/onchain/program-ids";

/** Default broker / fee recipient — public Squads treasury from site config. */
export function getSvfBrokerPubkey(): string {
  return (
    process.env.SVF_BROKER_PUBKEY?.trim() ||
    site.vaultAddresses?.treasury ||
    ""
  );
}

export function isSvfBrokerConfigured(): boolean {
  return getSvfBrokerPubkey().length >= 32;
}

/** Tensor Fees program id for transaction account metas. */
export function getTensorFeesProgramIdString(): string {
  return TENSOR_PROGRAM_IDS.fees;
}

/**
 * Target broker fee basis points for SVF-fronted fills (design default).
 * Production values require ops + partner sign-off — not enforced on-chain here.
 */
export function getTargetBrokerFeeBps(): number {
  const raw = process.env.SVF_BROKER_FEE_BPS?.trim();
  if (!raw) return 100;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 && n <= 500 ? n : 100;
}

export type FeeSplitPreview = {
  tensorFeesProgram: string;
  brokerPubkey: string;
  targetBrokerBps: number;
  note: string;
};

/** Read-only preview for admin / ops tooling — not an on-chain quote. */
export function previewFeeSplit(): FeeSplitPreview {
  return {
    tensorFeesProgram: TENSOR_PROGRAM_IDS.fees,
    brokerPubkey: getSvfBrokerPubkey(),
    targetBrokerBps: getTargetBrokerFeeBps(),
    note: "Configure broker PDA via tensor-foundation/fees on devnet before mainnet.",
  };
}
