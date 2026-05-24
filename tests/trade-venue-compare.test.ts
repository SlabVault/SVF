import assert from "node:assert/strict";
import test from "node:test";

import { buildVenueCompareRows } from "@/lib/trade/venue-compare";
import type { TradeListing } from "@/lib/trade-listings";

function listing(
  overrides: Partial<TradeListing> & Pick<TradeListing, "partner" | "askSol" | "collectionId">,
): TradeListing {
  return {
    id: "mint-1",
    name: "Test slab",
    grade: "PSA 10",
    acquiredAt: "2026-01-01",
    imageUrl: "/x.jpg",
    vaultedUrl: null,
    collectrUrl: null,
    status: "AVAILABLE",
    estimatedValueUsd: null,
    solPrice: overrides.askSol,
    svfPrice: 0,
    ...overrides,
  };
}

test("buildVenueCompareRows merges primary and alternateVenueAsks sorted by ask", () => {
  const rows = buildVenueCompareRows(
    listing({
      partner: "phygitals",
      askSol: 1.4,
      collectionId: "phygitals",
      alternateVenueAsks: [
        {
          partner: "collector_crypt",
          askSol: 2.2,
          collectionId: "collector-crypt",
        },
      ],
    }),
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.partner, "phygitals");
  assert.equal(rows[0]?.askSol, 1.4);
  assert.equal(rows[1]?.partner, "collector_crypt");
  assert.equal(rows[1]?.askSol, 2.2);
});

test("buildVenueCompareRows returns single row when no alternates", () => {
  const rows = buildVenueCompareRows(
    listing({
      partner: "collector_crypt",
      askSol: 3,
      collectionId: "collector-crypt",
    }),
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.partner, "collector_crypt");
});
