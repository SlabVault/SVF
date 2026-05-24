import assert from "node:assert/strict";
import test from "node:test";

import {
  canTransitionTransactionStatus,
  getAllowedTransactionTransitions,
  isCheckoutIdempotentState,
} from "../lib/transaction-state";

test("canTransitionTransactionStatus allows identity and valid pending exits", () => {
  assert.equal(canTransitionTransactionStatus("PENDING", "PENDING"), true);
  assert.equal(canTransitionTransactionStatus("PENDING", "PENDING_FULFILLMENT"), true);
  assert.equal(canTransitionTransactionStatus("PENDING", "COMPLETED"), true);
  assert.equal(canTransitionTransactionStatus("PENDING", "FAILED"), true);
  assert.equal(canTransitionTransactionStatus("PENDING", "CANCELLED"), true);
});

test("canTransitionTransactionStatus blocks illegal pending and terminal transitions", () => {
  assert.equal(canTransitionTransactionStatus("PENDING", "PENDING"), true);
  assert.equal(canTransitionTransactionStatus("COMPLETED", "PENDING"), false);
  assert.equal(canTransitionTransactionStatus("FAILED", "PENDING_FULFILLMENT"), false);
  assert.equal(canTransitionTransactionStatus("CANCELLED", "COMPLETED"), false);
  assert.equal(
    canTransitionTransactionStatus("PENDING_FULFILLMENT", "PENDING"),
    false,
  );
});

test("getAllowedTransactionTransitions exposes checkout-relevant pending exits", () => {
  assert.deepEqual(getAllowedTransactionTransitions("PENDING"), [
    "PENDING_FULFILLMENT",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
  ]);
  assert.deepEqual(getAllowedTransactionTransitions("COMPLETED"), []);
});

test("isCheckoutIdempotentState covers post-checkout replay statuses only", () => {
  assert.equal(isCheckoutIdempotentState("PENDING_FULFILLMENT"), true);
  assert.equal(isCheckoutIdempotentState("COMPLETED"), true);
  assert.equal(isCheckoutIdempotentState("PENDING"), false);
  assert.equal(isCheckoutIdempotentState("FAILED"), false);
  assert.equal(isCheckoutIdempotentState("CANCELLED"), false);
});
