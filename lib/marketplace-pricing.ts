import { parsePaymentSplit, type PaymentSplit } from "@/lib/marketplace-split";

type ReservePricingInput = {
  slabSolPrice: number;
  slabSvfPrice: number;
  estimatedValueUsd: number | null;
  split: unknown;
};

type ReservePricingOutput = {
  split: PaymentSplit;
  solAmount: number;
  svfAmount: number;
  listPriceUsdSnapshot: number | null;
};

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function deriveReservePricing(input: ReservePricingInput): ReservePricingOutput {
  const split = parsePaymentSplit(input.split);
  const listPriceUsdSnapshot = input.estimatedValueUsd ?? null;
  const slabSolPrice = Number(input.slabSolPrice) || 0;
  const slabSvfPrice = Number(input.slabSvfPrice) || 0;

  if (split === "SOL_80_SVF_20") {
    return {
      split,
      // v1 heuristic: preserve listing total while shifting more weight to SOL.
      // This can be replaced by oracle-based USD pricing later.
      solAmount: round6(slabSolPrice * 1.25),
      svfAmount: round6(slabSvfPrice * 0.5),
      listPriceUsdSnapshot,
    };
  }

  return {
    split: "FIXED_DUAL",
    solAmount: round6(slabSolPrice),
    svfAmount: round6(slabSvfPrice),
    listPriceUsdSnapshot,
  };
}
