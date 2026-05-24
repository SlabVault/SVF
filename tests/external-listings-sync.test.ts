import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import externalListingsJson from "@/data/external-listings.json";
import {
  __setCollectorCryptApiListingsForTests,
  __setCollectorCryptScrapeForTests,
  fetchCollectorCryptIngestListings,
  fetchCollectorCryptListings,
} from "@/lib/collector-crypt-live-listings";
import {
  __setExternalListingsSyncDepsForTests,
  resolveSyncExternalListingsSuccess,
  syncExternalListingsToJson,
} from "@/lib/external-listings-sync";
import {
  assertActivePhygitalsSeedRows,
  countActivePhygitalsSeedRows,
  MIN_ACTIVE_PHYGITALS_SEED_ROWS,
  PHYGITALS_LIVE_INGEST_AVAILABLE,
  refreshPhygitalsSeedRows,
} from "@/lib/phygitals-listings";
import type { ExternalListingItem } from "@/types/external-listing";

import { withTemporaryEnv } from "./helpers/test-helpers";

afterEach(() => {
  __setExternalListingsSyncDepsForTests(null);
  __setCollectorCryptApiListingsForTests(null);
  __setCollectorCryptScrapeForTests(null);
});

const phyRow: ExternalListingItem = {
  id: "pg-test",
  source: "phygitals",
  externalId: "test-001",
  deepLinkUrl: "https://phygitals.com/invite/slabvault",
  title: "Test slab",
  grade: "PSA 10",
  grader: "PSA",
  certNumber: "1111111111",
  priceUsd: 100,
  priceSol: null,
  currency: "USD",
  imageUrl: "https://example.com/a.png",
  setName: null,
  cardName: null,
  fmvUsd: 95,
  status: "active",
  indexedAt: "2026-05-20T00:00:00.000Z",
  staleAfter: "2026-05-21T00:00:00.000Z",
};

const ccRow: ExternalListingItem = {
  ...phyRow,
  id: "cc-preserve",
  source: "collector_crypt",
  externalId: "cc-preserve-001",
  deepLinkUrl: "https://collectorcrypt.com/marketplace",
  certNumber: null,
};

const manualRow: ExternalListingItem = {
  ...phyRow,
  id: "manual-preserve",
  source: "manual",
  externalId: "manual-001",
  deepLinkUrl: "https://example.com/listing",
  indexedAt: "2026-05-20T00:00:00.000Z",
  staleAfter: "2026-05-21T00:00:00.000Z",
};

test("PHYGITALS_LIVE_INGEST_AVAILABLE is false (seed-only ingest)", () => {
  assert.equal(PHYGITALS_LIVE_INGEST_AVAILABLE, false);
});

test("external-listings.json has active phygitals seed rows", () => {
  const rows = externalListingsJson as ExternalListingItem[];
  const count = countActivePhygitalsSeedRows(rows);

  assert.ok(
    count >= MIN_ACTIVE_PHYGITALS_SEED_ROWS,
    `expected >= ${MIN_ACTIVE_PHYGITALS_SEED_ROWS} active phygitals rows, got ${count}`,
  );
  assert.doesNotThrow(() => assertActivePhygitalsSeedRows(rows));
});

test("refreshPhygitalsSeedRows bumps indexedAt on active phygitals rows only", () => {
  const indexedAt = "2026-05-21T12:00:00.000Z";
  const staleAfter = "2026-05-22T12:00:00.000Z";

  const refreshed = refreshPhygitalsSeedRows([phyRow, ccRow], indexedAt, staleAfter);

  assert.equal(refreshed[0]?.indexedAt, indexedAt);
  assert.equal(refreshed[0]?.staleAfter, staleAfter);
  assert.equal(refreshed[1]?.indexedAt, ccRow.indexedAt);
});

test("resolveSyncExternalListingsSuccess allows partial success when CC scrape fails", () => {
  assert.equal(
    resolveSyncExternalListingsSuccess({
      errors: ["Collector Crypt scrape failed: timeout"],
      mergedCount: 2,
      ccFetchFailed: true,
      preservedNonCcCount: 1,
      retainedCcCount: 1,
    }),
    true,
  );
  assert.equal(
    resolveSyncExternalListingsSuccess({
      errors: ["Collector Crypt scrape failed: timeout"],
      mergedCount: 0,
      ccFetchFailed: true,
      preservedNonCcCount: 0,
      retainedCcCount: 0,
    }),
    false,
  );
});

test("syncExternalListingsToJson retains cached CC rows when scrape returns empty", async () => {
  const written: ExternalListingItem[][] = [];

  __setExternalListingsSyncDepsForTests({
    fetchCollectorCryptIngestListings: async () => ({ listings: [], source: "none" }),
    readExistingListings: async () => [ccRow, phyRow],
    writeListings: async (merged) => {
      written.push(merged);
    },
    getDatabaseUrl: () => undefined,
  });

  const result = await syncExternalListingsToJson();

  assert.equal(result.success, true);
  assert.equal(result.collectorCryptCount, 1);
  assert.equal(result.phygitalsCount, 1);
  assert.equal(result.errors.length, 0);
  assert.equal(written[0]?.find((row) => row.id === ccRow.id)?.externalId, "cc-preserve-001");
});

test("syncExternalListingsToJson surfaces CC scrape errors without failing when rows preserved", async () => {
  const written: ExternalListingItem[][] = [];

  __setExternalListingsSyncDepsForTests({
    fetchCollectorCryptIngestListings: async () => {
      throw new Error("network timeout");
    },
    readExistingListings: async () => [ccRow, phyRow],
    writeListings: async (merged) => {
      written.push(merged);
    },
    getDatabaseUrl: () => undefined,
  });

  const result = await syncExternalListingsToJson();

  assert.equal(result.success, true);
  assert.equal(result.collectorCryptCount, 1);
  assert.match(result.errors[0] ?? "", /Collector Crypt ingest failed/);
  assert.equal(written[0]?.length, 2);
});

test("syncExternalListingsToJson refreshes phygitals seed rows and preserves manual rows when CC fetch fails", async () => {
  const written: ExternalListingItem[][] = [];
  const stalePhyRow: ExternalListingItem = {
    ...phyRow,
    indexedAt: "2026-05-20T00:00:00.000Z",
    staleAfter: "2026-05-21T00:00:00.000Z",
  };

  __setExternalListingsSyncDepsForTests({
    fetchCollectorCryptIngestListings: async () => {
      throw new Error("network timeout");
    },
    readExistingListings: async () => [ccRow, stalePhyRow, manualRow],
    writeListings: async (merged) => {
      written.push(merged);
    },
    getDatabaseUrl: () => undefined,
  });

  const result = await syncExternalListingsToJson();
  const merged = written[0] ?? [];

  assert.equal(result.success, true);
  assert.equal(result.manualPreserved, 2);
  assert.equal(result.collectorCryptCount, 1);
  assert.equal(result.phygitalsCount, 1);
  assert.equal(result.totalWritten, 3);
  assert.match(result.errors[0] ?? "", /Collector Crypt ingest failed/);

  const writtenPhy = merged.find((row) => row.id === stalePhyRow.id);
  const writtenManual = merged.find((row) => row.id === manualRow.id);
  const writtenCc = merged.find((row) => row.id === ccRow.id);

  assert.ok(writtenPhy);
  assert.ok(writtenManual);
  assert.ok(writtenCc);
  assert.notEqual(writtenPhy.indexedAt, stalePhyRow.indexedAt);
  assert.notEqual(writtenPhy.staleAfter, stalePhyRow.staleAfter);
  assert.equal(writtenManual.indexedAt, manualRow.indexedAt);
  assert.equal(writtenManual.staleAfter, manualRow.staleAfter);
  assert.equal(writtenCc.indexedAt, ccRow.indexedAt);
});

test("syncExternalListingsToJson reports cc ingest source and db diagnostics", async () => {
  __setExternalListingsSyncDepsForTests({
    fetchCollectorCryptIngestListings: async () => ({
      listings: [
        {
          source: "collector_crypt",
          externalId: "cc-api-1",
          deepLinkUrl: "https://collectorcrypt.com/marketplace",
          title: "API Card",
          grade: "PSA 10",
          grader: "PSA",
          priceUsd: 50,
          priceSol: null,
          currency: "USD",
          imageUrl: "https://example.com/a.png",
          cardName: "API Card",
          fmvUsd: 45,
          status: "active",
        },
      ],
      source: "api",
    }),
    readExistingListings: async () => [phyRow],
    writeListings: async () => {},
    getDatabaseUrl: () => "postgresql://localhost:5432/test",
    upsertExternalListings: async (rows) => ({ count: rows.length }),
  });

  const result = await syncExternalListingsToJson();

  assert.equal(result.ccIngestSource, "api");
  assert.equal(result.dbConfigured, true);
  assert.equal(result.collectorCryptCount, 1);
});

test("fetchCollectorCryptListings continues after per-account scrape failure", async () => {
  const deployerAccount =
    "https://collectorcrypt.com/account/CWqc6DQhHxdnDSwrjG3LGnyWPQ3dRNfCY5umvTj8NBE3";

  __setCollectorCryptScrapeForTests(async (accountUrl: string) => {
    if (accountUrl === deployerAccount) {
      throw new Error("ECONNABORTED timeout");
    }
    return [
      {
        id: "cc-live-1",
        name: "Pikachu",
        grade: "PSA 10",
        estimatedValueUsd: 100,
        acquiredAt: "2026-05-01",
        imageUrl: "https://example.com/card.png",
        profileUrl: accountUrl,
        itemUrl: "https://collectorcrypt.com/marketplace",
        collectrUrl: null,
      },
    ];
  });

  const listings = await fetchCollectorCryptListings();

  assert.equal(listings.length, 1);
  assert.equal(listings[0]?.externalId, "cc-live-1");
  assert.equal(listings[0]?.source, "collector_crypt");
});

const ccApiListing = {
  source: "collector_crypt" as const,
  externalId: "cc-api-1",
  deepLinkUrl: "https://collectorcrypt.com/marketplace",
  title: "API Card",
  grade: "PSA 10",
  grader: "PSA" as const,
  priceUsd: 50,
  priceSol: null,
  currency: "USD" as const,
  imageUrl: "https://example.com/a.png",
  cardName: "API Card",
  fmvUsd: 45,
  status: "active" as const,
};

test("fetchCollectorCryptIngestListings prefers API and skips scrape when API returns rows", async () => {
  let scrapeCalled = false;

  __setCollectorCryptApiListingsForTests(async () => [ccApiListing]);
  __setCollectorCryptScrapeForTests(async () => {
    scrapeCalled = true;
    return [];
  });

  const ingest = await fetchCollectorCryptIngestListings();

  assert.equal(ingest.source, "api");
  assert.equal(ingest.listings.length, 1);
  assert.equal(ingest.listings[0]?.externalId, "cc-api-1");
  assert.equal(scrapeCalled, false);
});

test("fetchCollectorCryptIngestListings falls back to scrape when API returns empty", async () => {
  let scrapeCalled = false;

  __setCollectorCryptApiListingsForTests(async () => []);
  __setCollectorCryptScrapeForTests(async (accountUrl: string) => {
    scrapeCalled = true;
    return [
      {
        id: "cc-scrape-1",
        name: "Charizard",
        grade: "PSA 9",
        estimatedValueUsd: 200,
        acquiredAt: "2026-05-01",
        imageUrl: "https://example.com/c.png",
        profileUrl: accountUrl,
        itemUrl: "https://collectorcrypt.com/marketplace",
        collectrUrl: null,
      },
    ];
  });

  const ingest = await fetchCollectorCryptIngestListings();

  assert.equal(ingest.source, "scrape");
  assert.equal(scrapeCalled, true);
  assert.equal(ingest.listings.length, 1);
  assert.equal(ingest.listings[0]?.externalId, "cc-scrape-1");
});

test("syncExternalListingsToJson upserts active rows when DATABASE_URL is set", async () => {
  let upserted: ExternalListingItem[] | null = null;

  __setExternalListingsSyncDepsForTests({
    fetchCollectorCryptIngestListings: async () => ({ listings: [], source: "none" }),
    readExistingListings: async () => [ccRow, phyRow],
    writeListings: async () => {},
    getDatabaseUrl: () => "postgresql://localhost:5432/test",
    upsertExternalListings: async (rows) => {
      upserted = rows;
      return {
        count: rows.filter((row) => row.status === "active").length,
      };
    },
  });

  const result = await syncExternalListingsToJson();

  assert.equal(result.success, true);
  assert.equal(result.dbUpsertCount, 2);
  assert.equal(upserted?.length, 2);
  assert.ok(upserted?.every((row) => row.status === "active"));
});

test("syncExternalListingsToJson excludes sold and unknown rows from DB upsert batch", async () => {
  const soldRow: ExternalListingItem = {
    ...phyRow,
    id: "pg-sold",
    externalId: "test-sold",
    status: "sold",
  };
  const unknownRow: ExternalListingItem = {
    ...phyRow,
    id: "pg-unknown",
    externalId: "test-unknown",
    status: "unknown",
  };
  const written: ExternalListingItem[][] = [];
  let upserted: ExternalListingItem[] | null = null;

  __setExternalListingsSyncDepsForTests({
    fetchCollectorCryptIngestListings: async () => ({ listings: [], source: "none" }),
    readExistingListings: async () => [ccRow, phyRow, soldRow, unknownRow],
    writeListings: async (merged) => {
      written.push(merged);
    },
    getDatabaseUrl: () => "postgresql://localhost:5432/test",
    upsertExternalListings: async (rows) => {
      upserted = rows;
      return { count: rows.length };
    },
  });

  const result = await syncExternalListingsToJson();
  const merged = written[0] ?? [];

  assert.equal(result.success, true);
  assert.equal(result.totalWritten, 4);
  assert.equal(merged.length, 4);
  assert.ok(merged.some((row) => row.id === soldRow.id));
  assert.ok(merged.some((row) => row.id === unknownRow.id));

  assert.equal(result.dbUpsertCount, 2);
  assert.equal(upserted?.length, 2);
  assert.ok(upserted?.every((row) => row.status === "active"));
  assert.ok(upserted?.some((row) => row.id === phyRow.id));
  assert.ok(upserted?.some((row) => row.id === ccRow.id));
  assert.ok(!upserted?.some((row) => row.id === soldRow.id));
  assert.ok(!upserted?.some((row) => row.id === unknownRow.id));
});

test("syncExternalListingsToJson fails when CC scrape errors and seed is empty", async () => {
  __setExternalListingsSyncDepsForTests({
    fetchCollectorCryptIngestListings: async () => {
      throw new Error("network timeout");
    },
    readExistingListings: async () => [],
    writeListings: async () => {},
    getDatabaseUrl: () => undefined,
  });

  const result = await syncExternalListingsToJson();

  assert.equal(result.success, false);
  assert.equal(result.collectorCryptCount, 0);
  assert.equal(result.totalWritten, 0);
  assert.equal(result.errors.length, 1);
});

test("syncExternalListingsToJson surfaces blocked DB upsert remediation in errors", async () => {
  __setExternalListingsSyncDepsForTests({
    fetchCollectorCryptIngestListings: async () => ({ listings: [], source: "none" }),
    readExistingListings: async () => [phyRow],
    writeListings: async () => {},
    getDatabaseUrl: () => "postgresql://localhost:5432/test",
    upsertExternalListings: async () => ({
      count: 0,
      blockedReason:
        "External listing DB upsert skipped (write gate): Use prisma+postgres:// with `npx prisma dev`.",
    }),
  });

  const result = await syncExternalListingsToJson();

  assert.equal(result.dbConfigured, true);
  assert.equal(result.dbUpsertCount, 0);
  assert.equal(result.phygitalsCount, 1);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0] ?? "", /write gate/);
  assert.match(result.errors[0] ?? "", /prisma\+postgres:\/\//);
});

test("syncExternalListingsToJson reports DB upsert skip for unsupported DATABASE_URL protocol", async () => {
  await withTemporaryEnv(
    { DATABASE_URL: "mysql://user:pass@localhost:3306/db" },
    async () => {
      __setExternalListingsSyncDepsForTests({
        fetchCollectorCryptIngestListings: async () => ({ listings: [], source: "none" }),
        readExistingListings: async () => [phyRow],
        writeListings: async () => {},
      });

      const result = await syncExternalListingsToJson();

      assert.equal(result.dbConfigured, true);
      assert.equal(result.dbUpsertCount, 0);
      assert.equal(result.phygitalsCount, 1);
      assert.ok(result.errors.some((msg) => /upsert skipped/i.test(msg)));
      assert.ok(
        result.errors.some((msg) =>
          /postgresql:\/\/|prisma\+postgres:\/\//i.test(msg),
        ),
      );
    },
  );
});
