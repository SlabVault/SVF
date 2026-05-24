import assert from "node:assert/strict";
import test from "node:test";

import {
  isValidSolanaPubkey,
  isValidSolanaTxSignature,
  logTensorFillSignatures,
} from "@/lib/onchain/tensor-fill-verify";

const BUYER = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
const MINT = "So11111111111111111111111111111111111111112";
/** 88-char base58 stub matching Solana ed25519 signature encoding length. */
const VALID_SIG = "1".repeat(88);

test("isValidSolanaPubkey accepts base58 pubkeys", () => {
  assert.equal(isValidSolanaPubkey(BUYER), true);
  assert.equal(isValidSolanaPubkey(MINT), true);
  assert.equal(isValidSolanaPubkey("not-a-pubkey"), false);
});

test("isValidSolanaTxSignature accepts base58 87-88 char signatures", () => {
  assert.equal(isValidSolanaTxSignature(VALID_SIG), true);
  assert.equal(isValidSolanaTxSignature("too-short"), false);
  assert.equal(isValidSolanaTxSignature("0OIl".repeat(22)), false);
});

test("logTensorFillSignatures returns ok for valid fill payload", () => {
  const result = logTensorFillSignatures([VALID_SIG], { mint: MINT, buyer: BUYER });
  assert.deepEqual(result, { ok: true, signatures: [VALID_SIG] });
});

test("logTensorFillSignatures rejects empty signatures", () => {
  const result = logTensorFillSignatures([], { mint: MINT, buyer: BUYER });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.reason, /No transaction signatures/);
  }
});

test("logTensorFillSignatures rejects invalid mint", () => {
  const result = logTensorFillSignatures([VALID_SIG], { mint: "bad", buyer: BUYER });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.reason, /Invalid mint/);
  }
});

test("logTensorFillSignatures rejects malformed signature", () => {
  const result = logTensorFillSignatures(["bad-signature"], { mint: MINT, buyer: BUYER });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.reason, /Invalid transaction signature/);
  }
});
