import test from "node:test";
import assert from "node:assert/strict";

import {
  isPaymentSplit,
  parsePaymentSplit,
  PAYMENT_SPLITS,
} from "../lib/marketplace-split";

test("parsePaymentSplit falls back for unsupported values", () => {
  assert.equal(parsePaymentSplit("bad"), "FIXED_DUAL");
  assert.equal(parsePaymentSplit(null), "FIXED_DUAL");
});

test("parsePaymentSplit accepts known modes", () => {
  assert.equal(parsePaymentSplit("FIXED_DUAL"), "FIXED_DUAL");
  assert.equal(parsePaymentSplit("SOL_80_SVF_20"), "SOL_80_SVF_20");
});

test("isPaymentSplit validates only supported checkout modes", () => {
  for (const split of PAYMENT_SPLITS) {
    assert.equal(isPaymentSplit(split), true);
  }

  assert.equal(isPaymentSplit(undefined), false);
  assert.equal(isPaymentSplit(""), false);
  assert.equal(isPaymentSplit("SOL_50_SVF_50"), false);
});

test("parsePaymentSplit treats empty values as fixed dual default", () => {
  assert.equal(parsePaymentSplit(undefined), "FIXED_DUAL");
  assert.equal(parsePaymentSplit(""), "FIXED_DUAL");
});
