export const PAYMENT_SPLITS = ["FIXED_DUAL", "SOL_80_SVF_20"] as const;

export type PaymentSplit = (typeof PAYMENT_SPLITS)[number];

export function isPaymentSplit(value: unknown): value is PaymentSplit {
  return (
    typeof value === "string" &&
    (PAYMENT_SPLITS as readonly string[]).includes(value)
  );
}

export function parsePaymentSplit(value: unknown): PaymentSplit {
  if (!value) return "FIXED_DUAL";
  return isPaymentSplit(value) ? value : "FIXED_DUAL";
}
