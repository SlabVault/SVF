import assert from "node:assert/strict";
import { test, afterEach } from "node:test";

import { GET as allListingsGet } from "../app/api/trade/all/listings/route";
import type { TradePartnerId } from "../lib/onchain/collections";
import type { TradeCollectionConfig } from "../lib/onchain/collections";
import type { PartnerTradeListingsResult } from "../lib/partner-listings";
import {
  __setAllListingsLoadDepsForTests,
} from "../lib/trade/all-listings";
import {
  computeTradeCollectionStats,
  type TradeListing,
} from "../lib/trade-listings";
import { withTemporaryEnv } from "./helpers/test-helpers";

type AllListingRow = {
  collectionId: string;
  partner?: TradePartnerId | null;
  vaultedUrl?: string | null;
};

function listing(
  id: string,
  askSol: number,
  collectionId: string,
  partner: TradeListing["partner"],
): TradeListing {
  return {
    id,
    name: `Slab ${id}`,
    grade: "PSA 10",
    estimatedValueUsd: askSol * 150,
    acquiredAt: new Date().toISOString(),
    imageUrl: null,
    vaultedUrl: "https://example.com/vault",
    collectrUrl: null,
    status: "AVAILABLE",
    solPrice: askSol,
    svfPrice: 0,
    askSol,
    collectionId,
    partner,
  };
}

function partnerResult(
  slug: string,
  platform: "collector_crypt" | "phygitals",
  listings: TradeListing[],
): PartnerTradeListingsResult {
  return {
    platform,
    slug,
    listings,
    stats: computeTradeCollectionStats(listings),
    fromFallback: false,
    dbStatus: "unconfigured",
    sources: ["external_json"],
    tensorEnrichment: null,
  };
}

afterEach(() => {
  __setAllListingsLoadDepsForTests(null);
});

function assertEveryMergedListingHasPartnerAndHttpsVaultedUrl(
  listings: AllListingRow[],
) {
  assert.ok(listings.length >= 1, "expected at least one merged listing");
  for (const [index, listing] of listings.entries()) {
    assert.ok(
      listing.partner,
      `listing[${index}] (${listing.collectionId}) missing partner`,
    );
    const url = listing.vaultedUrl?.trim();
    assert.ok(
      url,
      `listing[${index}] (${listing.collectionId}) missing vaultedUrl`,
    );
    assert.match(
      url,
      /^https:\/\//,
      `listing[${index}] vaultedUrl must start with https://`,
    );
  }
}

test("all listings GET returns merged rows without Tensor key", async () => {
  await withTemporaryEnv(
    {
      DATABASE_URL: undefined,
      TENSOR_API_KEY: undefined,
      TENSOR_CC_COLLECTION_SLUGS: undefined,
    },
    async () => {
      const request = new Request("http://localhost/api/trade/all/listings");
      const response = await allListingsGet(request);
      const body = (await response.json()) as {
        source: string;
        listings: Array<AllListingRow & { askSol: number }>;
        stats: { listedCount: number; floorSol: number | null };
        venueCount: number;
        venues: string[];
        fromFallback: boolean;
        readConfigured: boolean;
      };

      assert.equal(response.status, 200);
      assert.equal(body.source, "all_listings");
      assert.ok(body.listings.length >= 1);
      assertEveryMergedListingHasPartnerAndHttpsVaultedUrl(body.listings);
      assert.ok(body.stats.listedCount >= 1);
      assert.ok(body.venueCount >= 1);
      assert.ok(body.venues.length >= 1);
      assert.equal(typeof body.fromFallback, "boolean");
      assert.equal(body.readConfigured, true);
      assert.equal(
        response.headers.get("X-Trade-All-Source"),
        "partner_ingest_aggregate",
      );
      assert.match(response.headers.get("Cache-Control") ?? "", /s-maxage=60/);
    },
  );
});

test("all listings GET includes partner ingest venues", async () => {
  await withTemporaryEnv(
    {
      DATABASE_URL: undefined,
      TENSOR_API_KEY: undefined,
    },
    async () => {
      const request = new Request("http://localhost/api/trade/all/listings");
      const response = await allListingsGet(request);
      const body = (await response.json()) as {
        listings: Array<{ collectionId: string }>;
        venues: string[];
      };

      assert.equal(response.status, 200);

      const collectionIds = new Set(body.listings.map((row) => row.collectionId));
      assert.ok(
        collectionIds.has("collector-crypt") || collectionIds.has("phygitals"),
        "expected at least one partner ingest collection in merged listings",
      );
      assert.ok(
        body.venues.includes("collector_crypt") ||
          body.venues.includes("phygitals"),
        "expected partner ingest venue in venues array",
      );
    },
  );
});

test("all listings GET ensures partner and https vaultedUrl on every row", async () => {
  await withTemporaryEnv(
    {
      DATABASE_URL: undefined,
      TENSOR_API_KEY: undefined,
      TENSOR_CC_COLLECTION_SLUGS: undefined,
    },
    async () => {
      const request = new Request("http://localhost/api/trade/all/listings");
      const response = await allListingsGet(request);
      const body = (await response.json()) as { listings: AllListingRow[] };

      assert.equal(response.status, 200);
      assertEveryMergedListingHasPartnerAndHttpsVaultedUrl(body.listings);
    },
  );
});

test("all listings GET sorts merged listings by price asc", async () => {
  await withTemporaryEnv(
    {
      DATABASE_URL: undefined,
      TENSOR_API_KEY: undefined,
    },
    async () => {
      const request = new Request("http://localhost/api/trade/all/listings");
      const response = await allListingsGet(request);
      const body = (await response.json()) as {
        listings: Array<{ askSol: number }>;
      };

      assert.equal(response.status, 200);
      assert.ok(body.listings.length >= 2);

      for (let i = 1; i < body.listings.length; i += 1) {
        const prev = body.listings[i - 1]?.askSol ?? 0;
        const curr = body.listings[i]?.askSol ?? 0;
        assert.ok(prev <= curr, "listings should be sorted price asc");
      }
    },
  );
});

test("all listings GET preserves alternateVenueAsks when cert lists on CC and Phygitals", async () => {
  const sharedMint = "Mint7777777777777777777777777777777777777";

  __setAllListingsLoadDepsForTests({
    listPartnerTradeListings: async (collection: TradeCollectionConfig) => {
      if (collection.slug === "collector-crypt") {
        return partnerResult("collector-crypt", "collector_crypt", [
          listing(sharedMint, 2.2, "collector-crypt", "collector_crypt"),
        ]);
      }
      if (collection.slug === "phygitals") {
        return partnerResult("phygitals", "phygitals", [
          listing(sharedMint, 1.4, "phygitals", "phygitals"),
        ]);
      }
      return partnerResult(collection.slug, "collector_crypt", []);
    },
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

  await withTemporaryEnv(
    {
      DATABASE_URL: undefined,
      TENSOR_API_KEY: undefined,
    },
    async () => {
      const request = new Request("http://localhost/api/trade/all/listings");
      const response = await allListingsGet(request);
      const body = (await response.json()) as {
        listings: Array<
          TradeListing & {
            alternateVenueAsks?: TradeListing["alternateVenueAsks"];
          }
        >;
      };

      assert.equal(response.status, 200);
      assert.equal(body.listings.length, 1);
      assert.equal(body.listings[0]?.askSol, 1.4);
      assert.equal(body.listings[0]?.partner, "phygitals");
      assert.deepEqual(body.listings[0]?.alternateVenueAsks, [
        {
          partner: "collector_crypt",
          askSol: 2.2,
          collectionId: "collector-crypt",
        },
      ]);
    },
  );
});
