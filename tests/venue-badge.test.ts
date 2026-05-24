import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  resolveListingVenuePartner,
  VENUE_LABELS,
} from "@/components/trade/venue-badge";
import type { TradeListing } from "@/lib/trade-listings";

const ROOT = process.cwd();

function read(relPath: string) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

test("VENUE_LABELS covers Solana partner venues", () => {
  assert.equal(VENUE_LABELS.collector_crypt, "CC");
  assert.equal(VENUE_LABELS.phygitals, "Phygitals");
  assert.equal(VENUE_LABELS.magic_eden, "ME");
  assert.equal(VENUE_LABELS.slabvault_treasury, "Treasury");
  assert.equal(VENUE_LABELS.beezie, "Beezie");
  assert.equal(VENUE_LABELS.courtyard, "Courtyard");
});

test("resolveListingVenuePartner prefers listing.partner", () => {
  const listing = { partner: "magic_eden" as const } satisfies Pick<
    TradeListing,
    "partner"
  >;
  assert.equal(
    resolveListingVenuePartner(listing, "collector-crypt"),
    "magic_eden",
  );
});

test("resolveListingVenuePartner falls back to collection registry", () => {
  const listing = {} satisfies Pick<TradeListing, "partner">;
  assert.equal(
    resolveListingVenuePartner(listing, "collector-crypt"),
    "collector_crypt",
  );
  assert.equal(
    resolveListingVenuePartner(listing, "phygitals"),
    "phygitals",
  );
});

test("resolveListingVenuePartner defaults to treasury for unknown slug", () => {
  const listing = {} satisfies Pick<TradeListing, "partner">;
  assert.equal(
    resolveListingVenuePartner(listing, "unknown-collection"),
    "slabvault_treasury",
  );
});

test("TensorNftCard renders VenueBadge on every listing tile", () => {
  const card = read("components/trade/tensor/nft-card.tsx");
  assert.match(card, /resolveListingVenuePartner\(listing, collectionSlug\)/);
  assert.match(card, /VenueBadge partner=\{venuePartner\}/);
  assert.match(card, /trade-card-venue/);
});

test("landing collection cards render VenueBadge", () => {
  const landingCard = read("components/trade/trade-collection-index-card.tsx");
  assert.match(landingCard, /VenueBadge partner=\{collection\.partner\}/);
});

test("collection index table rows render VenueBadge", () => {
  const table = read("components/trade/tensor/collection-desk-layout.tsx");
  assert.match(table, /VenueBadge partner=\{row\.partner\}/);
});
