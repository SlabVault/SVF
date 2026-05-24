import assert from "node:assert/strict";
import { test } from "node:test";

import { GET as partnerListingsGet } from "../app/api/trade/partners/[platform]/listings/route";
import { GET as partnerStatsGet } from "../app/api/trade/partners/[platform]/stats/route";
import { fetchPartnerIngestListingsForPlatform } from "../lib/partner-ingest-adapter";
import { computeTradeCollectionStats } from "../lib/trade-listings";
import { withTemporaryEnv } from "./helpers/test-helpers";

type PartnerListingRow = { collectionId: string; vaultedUrl?: string | null };

function assertEveryListingHasHttpsVaultedUrl(listings: PartnerListingRow[]) {
  assert.ok(listings.length >= 1, "expected at least one listing");
  for (const [index, listing] of listings.entries()) {
    const url = listing.vaultedUrl?.trim();
    assert.ok(url, `listing[${index}] missing vaultedUrl`);
    assert.match(
      url,
      /^https:\/\//,
      `listing[${index}] vaultedUrl must start with https://`,
    );
  }
}

test("partner listings GET returns 404 for unsupported platform", async () => {
  await withTemporaryEnv({ DATABASE_URL: undefined }, async () => {
    const request = new Request(
      "http://localhost/api/trade/partners/magic-eden/listings",
    );
    const response = await partnerListingsGet(request, {
      params: Promise.resolve({ platform: "magic-eden" }),
    });
    const body = (await response.json()) as { error?: string; supported?: string[] };

    assert.equal(response.status, 404);
    assert.equal(body.error, "Unsupported partner platform");
    assert.ok(body.supported?.includes("collector_crypt"));
  });
});

test("partner listings GET returns CC rows without Tensor key", async () => {
  await withTemporaryEnv(
    {
      DATABASE_URL: undefined,
      TENSOR_API_KEY: undefined,
      TENSOR_CC_COLLECTION_SLUGS: undefined,
    },
    async () => {
      const request = new Request(
        "http://localhost/api/trade/partners/collector_crypt/listings",
      );
      const response = await partnerListingsGet(request, {
        params: Promise.resolve({ platform: "collector_crypt" }),
      });
      const body = (await response.json()) as {
        source: string;
        platform: string;
        slug: string;
        listings: PartnerListingRow[];
        stats: { listedCount: number };
        readConfigured: boolean;
      };

      assert.equal(response.status, 200);
      assert.equal(body.source, "partner_ingest");
      assert.equal(body.platform, "collector_crypt");
      assert.equal(body.slug, "collector-crypt");
      assert.ok(body.listings.length >= 1);
      assert.equal(body.listings[0]?.collectionId, "collector-crypt");
      assertEveryListingHasHttpsVaultedUrl(body.listings);
      assert.ok(body.stats.listedCount >= 1);
      assert.equal(body.readConfigured, true);
      assert.equal(response.headers.get("X-Trade-Partner-Source"), "partner_ingest");
      assert.match(response.headers.get("Cache-Control") ?? "", /s-maxage=60/);
    },
  );
});

test("partner listings GET accepts collector-crypt alias", async () => {
  await withTemporaryEnv({ DATABASE_URL: undefined, TENSOR_API_KEY: undefined }, async () => {
    const request = new Request(
      "http://localhost/api/trade/partners/collector-crypt/listings",
    );
    const response = await partnerListingsGet(request, {
      params: Promise.resolve({ platform: "collector-crypt" }),
    });
    const body = (await response.json()) as { slug: string; listings: unknown[] };

    assert.equal(response.status, 200);
    assert.equal(body.slug, "collector-crypt");
    assert.ok(body.listings.length >= 1);
  });
});

test("partner listings GET returns phygitals seed rows", async () => {
  await withTemporaryEnv({ DATABASE_URL: undefined, TENSOR_API_KEY: undefined }, async () => {
    const request = new Request(
      "http://localhost/api/trade/partners/phygitals/listings",
    );
    const response = await partnerListingsGet(request, {
      params: Promise.resolve({ platform: "phygitals" }),
    });
    const body = (await response.json()) as {
      source: string;
      slug: string;
      listings: PartnerListingRow[];
    };

    assert.equal(response.status, 200);
    assert.equal(body.source, "partner_ingest");
    assert.equal(body.slug, "phygitals");
    assert.ok(body.listings.length >= 1);
    assertEveryListingHasHttpsVaultedUrl(body.listings);
  });
});

test("partner stats GET returns floor and count without listings array", async () => {
  await withTemporaryEnv({ DATABASE_URL: undefined, TENSOR_API_KEY: undefined }, async () => {
    const request = new Request(
      "http://localhost/api/trade/partners/collector_crypt/stats",
    );
    const response = await partnerStatsGet(request, {
      params: Promise.resolve({ platform: "collector_crypt" }),
    });
    const body = (await response.json()) as {
      source: string;
      slug: string;
      stats: {
        listedCount: number;
        floorSol: number | null;
        volume24hSol: number | null;
        volumeAllSol: number | null;
        priceChange24hPct: number | null;
      };
      listings?: unknown;
      readConfigured: boolean;
    };

    assert.equal(response.status, 200);
    assert.equal(body.source, "partner_ingest");
    assert.equal(body.slug, "collector-crypt");
    assert.equal(body.listings, undefined);
    assert.ok(body.stats.listedCount >= 1);
    assert.ok(body.stats.floorSol != null);
    assert.equal(body.readConfigured, true);
    assert.equal(response.headers.get("X-Trade-Partner-Source"), "partner_ingest");

    const ingest = await fetchPartnerIngestListingsForPlatform("collector_crypt");
    assert.ok(ingest);
    const expectedRibbon = computeTradeCollectionStats(ingest.listings);
    assert.ok(expectedRibbon.volumeAllSol != null && expectedRibbon.volumeAllSol > 0);
    assert.equal(body.stats.volumeAllSol, expectedRibbon.volumeAllSol);
    assert.equal(body.stats.volume24hSol, expectedRibbon.volume24hSol);
    assert.equal(body.stats.priceChange24hPct, expectedRibbon.priceChange24hPct);
  });
});

test("partner stats GET returns 404 for unsupported platform", async () => {
  const request = new Request(
    "http://localhost/api/trade/partners/magic-eden/stats",
  );
  const response = await partnerStatsGet(request, {
    params: Promise.resolve({ platform: "magic-eden" }),
  });

  assert.equal(response.status, 404);
});

test("partner listings GET rejects ?live=1 without auth in production", async () => {
  await withTemporaryEnv(
    {
      NODE_ENV: "production",
      CRON_SECRET: "cron-secret",
      DATABASE_URL: undefined,
      TENSOR_API_KEY: undefined,
    },
    async () => {
      const request = new Request(
        "http://localhost/api/trade/partners/collector_crypt/listings?live=1",
      );
      const response = await partnerListingsGet(request, {
        params: Promise.resolve({ platform: "collector_crypt" }),
      });
      const body = (await response.json()) as { ok?: boolean; code?: string };

      assert.equal(response.status, 401);
      assert.equal(body.ok, false);
      assert.equal(body.code, "SYNC_UNAUTHORIZED");
      assert.match(String(response.headers.get("www-authenticate")), /bearer/i);
    },
  );
});

test("partner stats GET rejects ?live=1 without auth in production", async () => {
  await withTemporaryEnv(
    {
      NODE_ENV: "production",
      CRON_SECRET: "cron-secret",
      DATABASE_URL: undefined,
      TENSOR_API_KEY: undefined,
    },
    async () => {
      const request = new Request(
        "http://localhost/api/trade/partners/collector_crypt/stats?live=1",
      );
      const response = await partnerStatsGet(request, {
        params: Promise.resolve({ platform: "collector_crypt" }),
      });
      const body = (await response.json()) as { ok?: boolean; code?: string };

      assert.equal(response.status, 401);
      assert.equal(body.ok, false);
      assert.equal(body.code, "SYNC_UNAUTHORIZED");
    },
  );
});
