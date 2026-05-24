import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test, { afterEach } from "node:test";

import type { MarketplaceSlab } from "@/lib/marketplace-slabs";
import type { TradeCollectionConfig } from "@/lib/onchain/collections";
import type { PartnerTradeListingsResult } from "@/lib/partner-listings";
import {
  AGGREGATE_COLLECTION_SLUGS,
  ALL_LISTINGS_SLUG,
  __setAllListingsLoadDepsForTests,
  buildAllListingsAggregateStats,
  countAllListingsVenues,
  countListingsByVenue,
  loadAllTradeListings,
  mergeAllTradeListings,
} from "@/lib/trade/all-listings";
import { applyMergedAllListingsAggregateOverride } from "@/lib/trade-landing-aggregate";
import { TRADE_ROUTES } from "@/lib/trade-routes";
import {
  computeTradeCollectionStats,
  DEFAULT_TRADE_FILTERS,
  filterTradeListings,
  mapSlabsToTradeListings,
  type TradeListing,
} from "@/lib/trade-listings";
import {
  buildTradeFilterSearchParams,
  parseTradeFiltersFromSearchParams,
} from "@/lib/trade/trade-filter-url";

const ROOT = process.cwd();

function read(relPath: string) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

function listing(
  id: string,
  askSol: number,
  collectionId: string,
  partner?: TradeListing["partner"],
): TradeListing {
  return {
    id,
    name: `Slab ${id}`,
    grade: "PSA 10",
    estimatedValueUsd: askSol * 150,
    acquiredAt: new Date().toISOString(),
    imageUrl: null,
    vaultedUrl: null,
    collectrUrl: null,
    status: "AVAILABLE",
    solPrice: askSol,
    svfPrice: 0,
    askSol,
    collectionId,
    partner,
  };
}

function treasurySlab(id: string, solPrice: number): MarketplaceSlab {
  return {
    id,
    name: `Vault ${id}`,
    grade: "PSA 10",
    estimatedValueUsd: solPrice * 150,
    acquiredAt: new Date().toISOString(),
    imageUrl: "https://example.com/slab.png",
    vaultedUrl: "https://solscan.io/token/example",
    collectrUrl: null,
    status: "AVAILABLE",
    solPrice,
    svfPrice: 0,
  };
}

function partnerResult(
  slug: string,
  platform: "collector_crypt" | "phygitals",
  listings: TradeListing[],
  fromFallback = false,
): PartnerTradeListingsResult {
  return {
    platform,
    slug,
    listings,
    stats: computeTradeCollectionStats(listings),
    fromFallback,
    dbStatus: "unconfigured",
    sources: ["external_json"],
    tensorEnrichment: null,
  };
}

async function withStubbedAllListingsSources(
  run: () => Promise<void>,
): Promise<void> {
  const sharedMint = "Mint7777777777777777777777777777777777777";

  __setAllListingsLoadDepsForTests({
    listPartnerTradeListings: async (collection: TradeCollectionConfig) => {
      if (collection.slug === "collector-crypt") {
        return partnerResult("collector-crypt", "collector_crypt", [
          listing("cc-only", 3, "collector-crypt", "collector_crypt"),
          listing(sharedMint, 2.2, "collector-crypt", "collector_crypt"),
        ]);
      }
      if (collection.slug === "phygitals") {
        return partnerResult("phygitals", "phygitals", [
          {
            ...listing(sharedMint, 1.4, "phygitals", "phygitals"),
            sellerWallet: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
          },
          listing("phy-only", 1.8, "phygitals", "phygitals"),
        ]);
      }
      return partnerResult(collection.slug, "collector_crypt", []);
    },
    loadOptionalTradeLandingTreasuryContext: async () => ({
      treasuryStats: {
        floorSol: 4,
        listedCount: 1,
        volume24hSol: null,
        priceChange24hPct: null,
        listedPct: null,
      },
      deskListings: [],
      listResult: {
        slabs: [treasurySlab("treasury-only", 4)],
        fromFallback: false,
        dbStatus: "unconfigured" as const,
      },
      treasuryUnavailable: false,
    }),
  });

  try {
    await run();
  } finally {
    __setAllListingsLoadDepsForTests(null);
  }
}

afterEach(() => {
  __setAllListingsLoadDepsForTests(null);
});

test("AGGREGATE_COLLECTION_SLUGS includes CC, Phygitals, and treasury", () => {
  const slugs = [...AGGREGATE_COLLECTION_SLUGS];
  assert.ok(slugs.includes("collector-crypt"));
  assert.ok(slugs.includes("phygitals"));
  assert.ok(slugs.includes("slabvault-treasury"));
});

test("mergeAllTradeListings with three venue batches reports venueCount via countAllListingsVenues", () => {
  const ccBatch = [listing("cc-1", 3, "collector-crypt", "collector_crypt")];
  const phygitalsBatch = [listing("phy-1", 2, "phygitals", "phygitals")];
  const treasuryBatch = mapSlabsToTradeListings(
    [treasurySlab("treasury-1", 4)],
    "slabvault-treasury",
  );

  const merged = mergeAllTradeListings([ccBatch, phygitalsBatch, treasuryBatch]);
  const { venueCount, venues } = countAllListingsVenues(merged);
  const stats = buildAllListingsAggregateStats(merged);

  assert.equal(merged.length, 3);
  assert.equal(venueCount, 3);
  assert.deepEqual(venues.sort(), [
    "collector_crypt",
    "phygitals",
    "slabvault_treasury",
  ]);
  assert.equal(stats.floorSol, 2);
  assert.equal(stats.listedCount, 3);
  assert.equal(stats.venueCount, 3);
});

test("TRADE_ROUTES.all points to aggregate desk", () => {
  assert.equal(TRADE_ROUTES.all, "/trade/all");
});

test("mergeAllTradeListings sorts price asc and drops zero asks", () => {
  const merged = mergeAllTradeListings([
    [listing("b", 2.5, "phygitals", "phygitals")],
    [listing("a", 1, "collector-crypt", "collector_crypt"), listing("c", 0, "phygitals")],
  ]);

  assert.equal(merged.length, 2);
  assert.equal(merged[0]?.id, "a");
  assert.equal(merged[1]?.id, "b");
});

test("mergeAllTradeListings dedupes treasury cert from slab name with partners and keeps lowest ask", () => {
  const cert = "9876543210";
  const treasury = mapSlabsToTradeListings([
    {
      id: "treasury-row",
      name: `Charizard PSA 10 #${cert}`,
      grade: "PSA 10",
      estimatedValueUsd: 500,
      acquiredAt: new Date().toISOString(),
      imageUrl: "/a.jpg",
      vaultedUrl: "https://vaulted.example/a",
      collectrUrl: null,
      status: "AVAILABLE",
      solPrice: 3,
      svfPrice: 50000,
    },
  ]);

  const merged = mergeAllTradeListings([
    treasury,
    [
      {
        ...listing("cc-row", 2.1, "collector-crypt", "collector_crypt"),
        name: `Charizard PSA 10 #${cert}`,
      },
    ],
  ]);

  assert.equal(treasury[0]?.partner, "slabvault_treasury");
  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.askSol, 2.1);
  assert.equal(merged[0]?.collectionId, "collector-crypt");
});

test("loadAllTradeListings merges CC, Phygitals, and treasury with best floor and venueCount", async () => {
  await withStubbedAllListingsSources(async () => {
    const result = await loadAllTradeListings();

    assert.equal(result.listings.length, 4);
    assert.equal(result.venueCount, 3);
    assert.deepEqual(result.venues.sort(), [
      "collector_crypt",
      "phygitals",
      "slabvault_treasury",
    ]);
    assert.equal(result.stats.floorSol, 1.4);
    assert.equal(result.stats.listedCount, 4);
    assert.equal(result.aggregate.listedCount, 4);
    assert.equal(result.aggregate.floorSol, 1.4);
    assert.equal(result.aggregate.venueCount, 3);
    assert.equal(result.fromFallback, false);

    assert.equal(result.listings[0]?.askSol, 1.4);
    assert.equal(result.listings[0]?.id, "Mint7777777777777777777777777777777777777");
    assert.equal(result.listings[0]?.collectionId, "phygitals");
    assert.deepEqual(result.listings[0]?.alternateVenueAsks, [
      {
        partner: "collector_crypt",
        askSol: 2.2,
        collectionId: "collector-crypt",
      },
    ]);
    assert.equal(result.listings[1]?.id, "phy-only");
    assert.equal(result.listings[2]?.id, "cc-only");
    assert.equal(result.listings[3]?.id, "treasury-only");
  });
});

test("loadAllTradeListings surfaces fromFallback when any ingest path uses fallback", async () => {
  __setAllListingsLoadDepsForTests({
    listPartnerTradeListings: async (collection: TradeCollectionConfig) =>
      partnerResult(
        collection.slug,
        collection.slug === "phygitals" ? "phygitals" : "collector_crypt",
        [listing(`${collection.slug}-row`, 1, collection.slug, collection.partner)],
        collection.slug === "collector-crypt",
      ),
    loadOptionalTradeLandingTreasuryContext: async () => ({
      treasuryStats: {
        floorSol: null,
        listedCount: 0,
        volume24hSol: null,
        priceChange24hPct: null,
        listedPct: null,
      },
      deskListings: [],
      listResult: {
        slabs: [],
        fromFallback: false,
        dbStatus: "unconfigured" as const,
      },
      treasuryUnavailable: false,
    }),
  });

  const result = await loadAllTradeListings();
  assert.equal(result.fromFallback, true);
  assert.equal(result.listings.length, 2);
});

test("mergeAllTradeListings dedupes mint aliases across venues and keeps lowest ask", () => {
  const seller = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
  const mint = "Mint7777777777777777777777777777777777777";

  const merged = mergeAllTradeListings([
    [
      listing(mint, 2.2, "collector-crypt", "collector_crypt"),
      {
        ...listing(mint, 1.4, "phygitals", "phygitals"),
        sellerWallet: seller,
        listState: "ListState1111111111111111111111111111111111111",
      },
    ],
    [listing(mint, 1.9, "collector-crypt", "collector_crypt")],
  ]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.askSol, 1.4);
  assert.equal(merged[0]?.id, mint);
  assert.equal(merged[0]?.sellerWallet, seller);
  assert.equal(merged[0]?.collectionId, "phygitals");
  assert.deepEqual(merged[0]?.alternateVenueAsks, [
    {
      partner: "collector_crypt",
      askSol: 1.9,
      collectionId: "collector-crypt",
    },
  ]);
});

test("buildAllListingsAggregateStats dedupes listedCount below per-venue batch sum", () => {
  const mint = "Mint8888888888888888888888888888888888888";
  const ccBatch = [
    listing(mint, 2.2, "collector-crypt", "collector_crypt"),
    listing("other-cc", 3, "collector-crypt", "collector_crypt"),
  ];
  const phygitalsBatch = [listing(mint, 1.4, "phygitals", "phygitals")];

  const previewSum = ccBatch.length + phygitalsBatch.length;
  const merged = mergeAllTradeListings([ccBatch, phygitalsBatch]);
  const stats = buildAllListingsAggregateStats(merged);

  assert.equal(previewSum, 3);
  assert.equal(stats.listedCount, 2);
  assert.ok(stats.listedCount < previewSum);
  assert.equal(stats.floorSol, 1.4);
  assert.equal(stats.buyNowSol, 1.4);
  assert.equal(stats.sellNowSol, 1.4);
  assert.equal(stats.venueCount, 2);
});

test("applyMergedAllListingsAggregateOverride replaces preview listed sum", () => {
  const mint = "Mint9999999999999999999999999999999999999";
  const ccBatch = [
    listing(mint, 2, "collector-crypt", "collector_crypt"),
    listing("solo-cc", 4, "collector-crypt", "collector_crypt"),
  ];
  const phygitalsBatch = [listing(mint, 1.5, "phygitals", "phygitals")];
  const merged = mergeAllTradeListings([ccBatch, phygitalsBatch]);
  const mergedStats = buildAllListingsAggregateStats(merged);

  const preview = {
    listedCount: ccBatch.length + phygitalsBatch.length,
    floorSol: 1.5,
    buyNowSol: 1.5,
    sellNowSol: 1.5,
    volume24hSol: 12,
  };

  const aggregate = applyMergedAllListingsAggregateOverride(preview, mergedStats);

  assert.equal(preview.listedCount, 3);
  assert.equal(aggregate.listedCount, 2);
  assert.equal(aggregate.floorSol, 1.5);
  assert.equal(aggregate.volume24hSol, 12);
});

test("countAllListingsVenues counts distinct partners", () => {
  const { venueCount, venues } = countAllListingsVenues([
    listing("1", 1, "collector-crypt", "collector_crypt"),
    listing("2", 2, "phygitals", "phygitals"),
    listing("3", 3, "collector-crypt", "collector_crypt"),
    listing("4", 4, "slabvault-treasury"),
  ]);

  assert.equal(venueCount, 3);
  assert.deepEqual(venues.sort(), [
    "collector_crypt",
    "phygitals",
    "slabvault_treasury",
  ]);
});

test("collection nav links All listings to aggregate route", () => {
  const nav = read("components/trade/trade-collection-nav.tsx");
  assert.match(nav, /All listings/);
  assert.match(nav, /TRADE_ROUTES\.all/);
  assert.match(nav, /ALL_LISTINGS_SLUG/);
});

test("aggregate desk page loads merged listings with live nav previews", () => {
  const page = read("app/trade/all/page.tsx");
  assert.match(page, /loadAllTradeListings/);
  assert.match(page, /loadTradeLandingNavCollections/);
  assert.match(page, /navActiveSlug=\{ALL_LISTINGS_SLUG\}/);
  assert.match(page, /aggregateDesk/);
  assert.match(page, /venuesCount=\{result\.venueCount\}/);
});

test("aggregate desk passes merged nav count to collection nav", () => {
  const desk = read("components/trade/trade-collection-desk-client.tsx");
  assert.match(desk, /navAggregateOverride/);
  assert.match(desk, /navAggregateOverride\?\.listedCount/);
  assert.match(desk, /aggregateListedCount=/);
  assert.match(desk, /aggregateDesk \? stats\.listedCount : undefined/);
  assert.match(desk, /aggregateFloorSol=/);
  assert.match(desk, /aggregateDesk \? stats\.floorSol : undefined/);

  const page = read("app/trade/all/page.tsx");
  assert.match(page, /navAggregateOverride=/);
  assert.match(page, /result\.aggregate\.listedCount/);
  assert.match(page, /result\.aggregate\.floorSol/);

  const nav = read("components/trade/trade-collection-nav.tsx");
  assert.match(nav, /aggregateListedCount/);
  assert.match(nav, /aggregateFloorSol/);
  assert.match(nav, /aggregateListedCount \?\? previewAggregate\.listedCount/);
});

test("all listings slug is stable for nav selection", () => {
  assert.equal(ALL_LISTINGS_SLUG, "all");
});

test("all-listings skips magic_eden Tensor depth when read unconfigured", () => {
  const source = read("lib/trade/all-listings.ts");
  assert.match(source, /isTensorReadConfigured/);
  const meBlock = source.slice(
    source.indexOf('collection.partner === "magic_eden"'),
    source.indexOf('collection.status === "preview"'),
  );
  assert.match(meBlock, /!isTensorReadConfigured\(\)/);
  assert.match(meBlock, /return \{ listings: \[\], fromFallback: false \}/);
  assert.match(
    meBlock,
    /if \(!isTensorReadConfigured\(\)\) \{[\s\S]*return \{ listings: \[\], fromFallback: false \}[\s\S]*getTradeCollectionDepth/,
  );
});

test("aggregate desk preview venues return empty without Tensor depth", () => {
  const source = read("lib/trade/all-listings.ts");
  const previewIdx = source.indexOf('collection.status === "preview"');
  assert.ok(previewIdx >= 0, "preview branch missing");
  const previewBlock = source.slice(
    previewIdx,
    source.indexOf('collection.slug === "slabvault-treasury"'),
  );
  assert.doesNotMatch(previewBlock, /getTradeCollectionDepth/);
  assert.match(
    previewBlock,
    /return \{ listings: \[\], fromFallback: false \}/,
  );
  assert.match(source, /AGGREGATE_COLLECTION_SLUGS[\s\S]*"beezie"/);
  assert.match(source, /AGGREGATE_COLLECTION_SLUGS[\s\S]*"courtyard"/);
});

test("collection desk wires INFO tab to CollectionInfoPanel", () => {
  const desk = read("components/trade/trade-collection-desk-client.tsx");
  assert.match(desk, /CollectionInfoPanel/);
  assert.match(desk, /activeTab === "info"/);
  assert.match(desk, /aggregateDesk=\{aggregateDesk\}/);
  assert.match(desk, /listings=\{listings\}/);
});

test("collection info panel explains aggregate venues and dedupe", () => {
  const panel = read("components/trade/collection-info-panel.tsx");
  assert.match(panel, /aggregateDesk/);
  assert.match(panel, /Merge &amp; dedupe/);
  assert.match(panel, /lowest ask/);
  assert.match(panel, /partner ingest/);
  assert.match(panel, /Preview/);
});

test("countListingsByVenue counts listed rows per partner", () => {
  const rows = countListingsByVenue([
    listing("1", 1, "collector-crypt", "collector_crypt"),
    listing("2", 2, "phygitals", "phygitals"),
    listing("3", 3, "collector-crypt", "collector_crypt"),
    listing("4", 4, "slabvault-treasury"),
  ]);

  assert.deepEqual(
    rows.map((row) => [row.partner, row.count]),
    [
      ["collector_crypt", 2],
      ["phygitals", 1],
      ["slabvault_treasury", 1],
    ],
  );
});

test("filterTradeListings filters aggregate desk by venue partners", () => {
  const listings = [
    listing("1", 1, "collector-crypt", "collector_crypt"),
    listing("2", 2, "phygitals", "phygitals"),
    listing("3", 3, "slabvault-treasury"),
  ];

  const filtered = filterTradeListings(listings, {
    ...DEFAULT_TRADE_FILTERS,
    partners: ["collector_crypt", "phygitals"],
  });

  assert.equal(filtered.length, 2);
  assert.deepEqual(filtered.map((row) => row.id).sort(), ["1", "2"]);
});

test("parseTradeFiltersFromSearchParams reads venue param", () => {
  const filters = parseTradeFiltersFromSearchParams(
    new URLSearchParams("venue=collector_crypt,phygitals"),
  );
  assert.deepEqual(filters.partners, ["collector_crypt", "phygitals"]);
});

test("buildTradeFilterSearchParams writes venue param", () => {
  const params = buildTradeFilterSearchParams({
    ...DEFAULT_TRADE_FILTERS,
    partners: ["slabvault_treasury"],
  });
  assert.equal(params.get("venue"), "slabvault_treasury");
});

test("aggregate desk filter rail exposes venue accordion", () => {
  const desk = read("components/trade/trade-collection-desk-client.tsx");
  const filters = read("components/trade/trade-trait-filters.tsx");

  assert.match(desk, /aggregateDesk=\{aggregateDesk\}/);
  assert.match(filters, /aggregateDesk/);
  assert.match(filters, /title="Venue"/);
  assert.match(filters, /VENUE_LABELS/);
  assert.match(filters, /togglePartner/);
});
