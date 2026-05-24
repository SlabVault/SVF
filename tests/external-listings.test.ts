import assert from "node:assert/strict";
import test from "node:test";

import {
  resetDatabaseStatusCache,
  setDatabaseStatusProbeForTests,
} from "@/lib/db-connection";
import { isDiscoverAggregatorEnabled } from "../lib/discover-config";
import {
  buildExternalListingId,
  computeStaleAfter,
  formatIndexedAge,
  isExternalListingStale,
  listExternalListings,
  normalizeExternalListingInput,
  upsertExternalListings,
} from "../lib/external-listings";
import {
  getExternalListingCtaLabel,
  getExternalListingSourceLabel,
  parseDiscoverPlatformFilter,
} from "../lib/external-listings-sources";
import { withTemporaryEnv } from "./helpers/test-helpers";

const sampleUpsertInput = {
  source: "manual" as const,
  externalId: "test-unsupported-db",
  deepLinkUrl: "https://example.com",
  title: "Test",
  grade: "PSA 10",
  priceUsd: 10,
  priceSol: null,
  currency: "USD" as const,
  imageUrl: "https://example.com/a.jpg",
  status: "active" as const,
};

test("parseDiscoverPlatformFilter accepts known platforms", () => {
  assert.equal(parseDiscoverPlatformFilter(undefined), "all");
  assert.equal(parseDiscoverPlatformFilter("phygitals"), "phygitals");
  assert.equal(parseDiscoverPlatformFilter("collector_crypt"), "collector_crypt");
  assert.equal(parseDiscoverPlatformFilter("invalid"), "all");
});

test("external listing helpers format platform labels and CTAs", () => {
  assert.equal(
    getExternalListingSourceLabel("collector_crypt"),
    "Collector Crypt",
  );
  assert.match(getExternalListingCtaLabel("phygitals"), /Phygitals/);
});

test("isExternalListingStale uses staleAfter threshold", () => {
  const fresh = {
    indexedAt: "2026-05-21T10:00:00.000Z",
    staleAfter: "2026-05-22T10:00:00.000Z",
  };
  assert.equal(
    isExternalListingStale(
      {
        id: "x",
        source: "manual",
        externalId: "x",
        deepLinkUrl: "https://example.com",
        title: "Test",
        grade: "PSA 10",
        priceUsd: 10,
        priceSol: null,
        currency: "USD",
        imageUrl: "https://example.com/a.jpg",
        status: "active",
        ...fresh,
      },
      Date.parse("2026-05-21T12:00:00.000Z"),
    ),
    false,
  );
  assert.equal(
    isExternalListingStale(
      {
        id: "x",
        source: "manual",
        externalId: "x",
        deepLinkUrl: "https://example.com",
        title: "Test",
        grade: "PSA 10",
        priceUsd: 10,
        priceSol: null,
        currency: "USD",
        imageUrl: "https://example.com/a.jpg",
        status: "active",
        ...fresh,
      },
      Date.parse("2026-05-23T10:00:00.000Z"),
    ),
    true,
  );
});

test("formatIndexedAge returns human-readable age", () => {
  const age = formatIndexedAge(
    "2026-05-21T10:00:00.000Z",
    Date.parse("2026-05-21T11:30:00.000Z"),
  );
  assert.match(age, /1h ago/);
});

test("listExternalListings serves JSON seed when DATABASE_URL is unset", async () => {
  await withTemporaryEnv({ DATABASE_URL: undefined }, async () => {
    resetDatabaseStatusCache();
    const result = await listExternalListings({ platform: "all" });

    assert.equal(result.fromFallback, true);
    assert.equal(result.dbStatus, "unconfigured");
    assert.ok(result.listings.length > 0);
    assert.equal(result.listings.every((row) => row.status === "active"), true);
  });
});

test("listExternalListings prefers JSON when database probe is unreachable", async () => {
  await withTemporaryEnv(
    { DATABASE_URL: "postgresql://invalid:5432/test" },
    async () => {
      setDatabaseStatusProbeForTests(async () => ({
        state: "unreachable",
        hint: "test unreachable",
        detail: "connection refused",
      }));

      try {
        const result = await listExternalListings({ platform: "collector_crypt" });

        assert.equal(result.fromFallback, true);
        assert.equal(result.dbStatus, "unreachable");
        assert.equal(result.dbHint, "test unreachable");
        assert.ok(result.listings.length > 0);
        assert.equal(
          result.listings.every((row) => row.source === "collector_crypt"),
          true,
        );
      } finally {
        setDatabaseStatusProbeForTests(null);
      }
    },
  );
});

test("listExternalListings prefers JSON when database status probe throws", async () => {
  await withTemporaryEnv(
    { DATABASE_URL: "postgresql://invalid:5432/test" },
    async () => {
      setDatabaseStatusProbeForTests(async () => {
        throw new Error("probe failed");
      });

      try {
        const result = await listExternalListings({ platform: "phygitals" });

        assert.equal(result.fromFallback, true);
        assert.equal(result.dbStatus, "unreachable");
        assert.ok(result.dbHint?.includes("status check failed"));
        assert.ok(result.listings.length > 0);
        assert.equal(
          result.listings.every((row) => row.source === "phygitals"),
          true,
        );
      } finally {
        setDatabaseStatusProbeForTests(null);
      }
    },
  );
});

test("normalizeExternalListingInput builds stable ids", () => {
  const listing = normalizeExternalListingInput({
    source: "collector_crypt",
    externalId: "abc-123",
    deepLinkUrl: "https://collectorcrypt.com/marketplace",
    title: "Pikachu",
    grade: "PSA 10",
    priceUsd: 50,
    priceSol: null,
    currency: "USD",
    imageUrl: "https://example.com/p.jpg",
    status: "active",
  });

  assert.equal(listing.id, buildExternalListingId("collector_crypt", "abc-123"));
  assert.ok(Date.parse(listing.staleAfter) > Date.parse(listing.indexedAt));
  const expectedStale = computeStaleAfter(new Date(listing.indexedAt));
  assert.equal(listing.staleAfter, expectedStale);
});

test("listExternalListings falls back to JSON seed when DATABASE_URL is unset", async () => {
  await withTemporaryEnv({ DATABASE_URL: undefined }, async () => {
    resetDatabaseStatusCache();
    const result = await listExternalListings();

    assert.equal(result.fromFallback, true);
    assert.equal(result.dbStatus, "unconfigured");
    assert.ok(result.listings.length > 0);
  });
});

test("listExternalListings falls back without throwing for unsupported DATABASE_URL protocol", async () => {
  await withTemporaryEnv(
    { DATABASE_URL: "mysql://user:pass@localhost:3306/db" },
    async () => {
      resetDatabaseStatusCache();
      const result = await listExternalListings();

      assert.equal(result.fromFallback, true);
      assert.equal(result.dbStatus, "unreachable");
      assert.match(result.dbHint ?? "", /protocol is not supported/i);
      assert.ok(result.listings.length > 0);
    },
  );
});

test("listExternalListings falls back when database probe is unreachable", async () => {
  await withTemporaryEnv(
    { DATABASE_URL: "postgresql://invalid:5432/test" },
    async () => {
      setDatabaseStatusProbeForTests(async () => ({
        state: "unreachable",
        hint: "test unreachable",
        detail: "fetch failed",
      }));

      try {
        const result = await listExternalListings();

        assert.equal(result.fromFallback, true);
        assert.equal(result.dbStatus, "unreachable");
        assert.equal(result.dbHint, "test unreachable");
        assert.ok(result.listings.length > 0);
      } finally {
        setDatabaseStatusProbeForTests(null);
      }
    },
  );
});

test("upsertExternalListings returns 0 without throwing when DATABASE_URL is unset", async () => {
  await withTemporaryEnv({ DATABASE_URL: undefined }, async () => {
    const result = await upsertExternalListings([sampleUpsertInput]);
    assert.equal(result.count, 0);
    assert.equal(result.blockedReason, undefined);
  });
});

test("upsertExternalListings returns 0 without throwing for unsupported DATABASE_URL protocol", async () => {
  await withTemporaryEnv(
    { DATABASE_URL: "mysql://user:pass@localhost:3306/db" },
    async () => {
      const result = await upsertExternalListings([sampleUpsertInput]);
      assert.equal(result.count, 0);
      assert.match(
        result.blockedReason ?? "",
        /protocol is not supported|write gate/,
      );
    },
  );
});

test("isDiscoverAggregatorEnabled is permanently off (discover lane archived)", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousFlag = process.env.DISCOVER_AGGREGATOR_ENABLED;

  process.env.NODE_ENV = "production";
  delete process.env.DISCOVER_AGGREGATOR_ENABLED;
  assert.equal(isDiscoverAggregatorEnabled(), false);

  process.env.DISCOVER_AGGREGATOR_ENABLED = "true";
  assert.equal(isDiscoverAggregatorEnabled(), false);

  process.env.NODE_ENV = previousNodeEnv;
  if (previousFlag === undefined) {
    delete process.env.DISCOVER_AGGREGATOR_ENABLED;
  } else {
    process.env.DISCOVER_AGGREGATOR_ENABLED = previousFlag;
  }
});
