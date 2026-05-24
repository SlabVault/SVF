import test from "node:test";
import assert from "node:assert/strict";

import { deriveReservePricing } from "../lib/marketplace-pricing";

test("deriveReservePricing keeps fixed listing by default", () => {
  const result = deriveReservePricing({
    slabSolPrice: 1.2,
    slabSvfPrice: 1000,
    estimatedValueUsd: 320,
    split: undefined,
  });

  assert.equal(result.split, "FIXED_DUAL");
  assert.equal(result.solAmount, 1.2);
  assert.equal(result.svfAmount, 1000);
  assert.equal(result.listPriceUsdSnapshot, 320);
});

test("deriveReservePricing applies 80/20 weighted split", () => {
  const result = deriveReservePricing({
    slabSolPrice: 2,
    slabSvfPrice: 500,
    estimatedValueUsd: 800,
    split: "SOL_80_SVF_20",
  });

  assert.equal(result.split, "SOL_80_SVF_20");
  assert.equal(result.solAmount, 2.5);
  assert.equal(result.svfAmount, 250);
});

test("deriveReservePricing preserves null USD snapshot and rounds to six decimals", () => {
  const result = deriveReservePricing({
    slabSolPrice: 1.23456789,
    slabSvfPrice: 999.999999,
    estimatedValueUsd: null,
    split: "FIXED_DUAL",
  });

  assert.equal(result.split, "FIXED_DUAL");
  assert.equal(result.solAmount, 1.234568);
  assert.equal(result.svfAmount, 999.999999);
  assert.equal(result.listPriceUsdSnapshot, null);
});

test("deriveReservePricing coerces invalid listing prices to zero", () => {
  const result = deriveReservePricing({
    slabSolPrice: Number.NaN,
    slabSvfPrice: Number.NaN,
    estimatedValueUsd: 120,
    split: "bad-mode",
  });

  assert.equal(result.split, "FIXED_DUAL");
  assert.equal(result.solAmount, 0);
  assert.equal(result.svfAmount, 0);
});
