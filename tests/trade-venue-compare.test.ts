import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { buildVenueCompareRows } from "@/lib/trade/venue-compare";
import type { TradeListing } from "@/lib/trade-listings";

const ROOT = process.cwd();

function read(relPath: string) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

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

test("ItemVenueCompareStrip partner rows use resolvePartnerDeepLink checkout URLs", () => {
  const client = read("components/trade/trade-item-detail-client.tsx");

  assert.match(
    client,
    /function resolveVenuePartnerCheckoutUrl[\s\S]*slugToPartnerPlatform\(row\.collectionId\)[\s\S]*resolvePartnerDeepLink\(/,
  );
  assert.match(
    client,
    /function ItemVenueCompareStrip[\s\S]*const partnerUrl = resolveVenuePartnerCheckoutUrl\(listing, row\)/,
  );
  assert.match(
    client,
    /function ItemVenueCompareStrip[\s\S]*partnerUrl \? \([\s\S]*data-growth-event="cta_trade_partner_deep_link"/,
  );
  assert.match(
    client,
    /function ItemVenueCompareStrip[\s\S]*\{VENUE_LABELS\[row\.partner as TradePartnerId\] \?\? row\.partner\} site ↗/,
  );
  assert.doesNotMatch(client, /\{ id: "compare", label: "COMPARE", soon: true \}/);
});
