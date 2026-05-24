import type { TransactionStatus } from "@prisma/client";

const ALLOWED_STATUS_TRANSITIONS: Readonly<Record<TransactionStatus, TransactionStatus[]>> = {
  PENDING: ["PENDING_FULFILLMENT", "COMPLETED", "FAILED", "CANCELLED"],
  PENDING_FULFILLMENT: ["COMPLETED", "FAILED", "CANCELLED"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

const IDEMPOTENT_CHECKOUT_STATUSES = new Set<TransactionStatus>([
  "PENDING_FULFILLMENT",
  "COMPLETED",
]);

export function canTransitionTransactionStatus(
  from: TransactionStatus,
  to: TransactionStatus,
): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

export function getAllowedTransactionTransitions(
  from: TransactionStatus,
): TransactionStatus[] {
  return [...(ALLOWED_STATUS_TRANSITIONS[from] ?? [])];
}

export function isCheckoutIdempotentState(status: TransactionStatus): boolean {
  return IDEMPOTENT_CHECKOUT_STATUSES.has(status);
}
