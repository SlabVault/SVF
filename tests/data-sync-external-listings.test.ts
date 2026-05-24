import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExternalListingsDbOperatorHints,
  buildSyncOperatorHints,
  formatExternalListingsSyncFailure,
  formatExternalListingsSyncWarnings,
  syncExternalListings,
} from "../lib/data-sync";
import type { SyncExternalListingsResult } from "../lib/external-listings-sync";
import { withTemporaryEnv } from "./helpers/test-helpers";

const DISCOVER_KEY = "external-listings:discover";
const TIMESTAMP = "2026-05-22T12:00:00.000Z";

type TestDiagnostics = Record<
  string,
  {
    lastAttemptAt: string;
    lastSuccessAt: string | null;
    lastStatus: "success" | "failure";
    detail: string;
  }
>;

function emptySyncResult(
  overrides: Partial<SyncExternalListingsResult> = {},
): SyncExternalListingsResult {
  return {
    success: true,
    collectorCryptCount: 0,
    phygitalsCount: 0,
    manualPreserved: 0,
    totalWritten: 0,
    dbUpsertCount: 0,
    ccIngestSource: "scrape",
    dbConfigured: false,
    errors: [],
    ...overrides,
  };
}

test("formatExternalListingsSyncFailure includes attempt count when retried", () => {
  assert.equal(
    formatExternalListingsSyncFailure(new Error("network timeout"), 3, 3),
    "GRAILS partner listings (sync:discover) failed after 3/3 attempts: network timeout",
  );
  assert.equal(
    formatExternalListingsSyncFailure(new Error("disk full"), 1, 1),
    "GRAILS partner listings (sync:discover) failed: disk full",
  );
});

test("formatExternalListingsSyncWarnings prefixes upstream errors", () => {
  assert.deepEqual(formatExternalListingsSyncWarnings(["Collector Crypt down"]), [
    "GRAILS partner listings (sync:discover): Collector Crypt down",
  ]);
  assert.deepEqual(
    formatExternalListingsSyncWarnings([
      "GRAILS partner listings (sync:discover): already prefixed",
    ]),
    ["GRAILS partner listings (sync:discover): already prefixed"],
  );
});

test("syncExternalListings retries thrown errors then succeeds", async () => {
  await withTemporaryEnv({ SYNC_EXTERNAL_LISTINGS_MAX_ATTEMPTS: "2" }, async () => {
    let calls = 0;
    const diagnostics: TestDiagnostics = {};

    const result = await syncExternalListings(
      diagnostics,
      TIMESTAMP,
      async () => {
        calls += 1;
        if (calls === 1) {
          throw new Error("transient fetch failure");
        }
        return emptySyncResult({
          collectorCryptCount: 4,
          totalWritten: 4,
        });
      },
    );

    assert.equal(calls, 2);
    assert.equal(result.updated, true);
    assert.equal(result.written, 4);
    assert.deepEqual(result.errors, []);
    assert.equal(diagnostics[DISCOVER_KEY]?.lastStatus, "success");
  });
});

test("syncExternalListings surfaces clear error after retries exhausted", async () => {
  await withTemporaryEnv({ SYNC_EXTERNAL_LISTINGS_MAX_ATTEMPTS: "2" }, async () => {
    const diagnostics: TestDiagnostics = {};

    const result = await syncExternalListings(
      diagnostics,
      TIMESTAMP,
      async () => {
        throw new Error("write EACCES");
      },
    );

    assert.equal(result.updated, false);
    assert.deepEqual(result.errors, [
      "GRAILS partner listings (sync:discover) failed after 2/2 attempts: write EACCES",
    ]);
    assert.equal(diagnostics[DISCOVER_KEY]?.lastStatus, "failure");
    assert.match(diagnostics[DISCOVER_KEY]?.detail ?? "", /2\/2 attempts/);
  });
});

test("syncExternalListings formats partial upstream failures", async () => {
  const diagnostics: TestDiagnostics = {};

  const result = await syncExternalListings(
    diagnostics,
    TIMESTAMP,
    async () =>
      emptySyncResult({
        success: false,
        ccIngestSource: "cached",
        errors: ["Collector Crypt sync failed unexpectedly."],
      }),
  );

  assert.equal(result.updated, false);
  assert.equal(result.ccIngestSource, "cached");
  assert.deepEqual(result.errors, [
    "GRAILS partner listings (sync:discover): Collector Crypt sync failed unexpectedly.",
  ]);
  assert.equal(diagnostics[DISCOVER_KEY]?.lastStatus, "failure");
  assert.match(diagnostics[DISCOVER_KEY]?.detail ?? "", /warnings:/);
  assert.match(diagnostics[DISCOVER_KEY]?.detail ?? "", /\(cached\)/);
});

test("buildExternalListingsDbOperatorHints suggests db:preflight:warn when upserts are zero", async () => {
  await withTemporaryEnv({ DATABASE_URL: "postgresql://example" }, () => {
    const hints = buildExternalListingsDbOperatorHints({
      lastAttemptAt: TIMESTAMP,
      dbUpsertCount: 0,
      upsertErrors: [],
    });

    assert.equal(hints.length, 1);
    assert.match(hints[0], /db:preflight:warn/);
    assert.match(hints[0], /dbUpsertCount=0/);
    assert.match(hints[0], /prisma generate|prisma\+postgres/i);
  });
});

test("buildExternalListingsDbOperatorHints surfaces upsert errors", async () => {
  await withTemporaryEnv({ DATABASE_URL: "postgresql://example" }, () => {
    const hints = buildExternalListingsDbOperatorHints({
      lastAttemptAt: TIMESTAMP,
      dbUpsertCount: 0,
      upsertErrors: ["External listing DB upsert failed unexpectedly."],
    });

    assert.equal(hints.length, 1);
    assert.match(hints[0], /upsert errors:/);
    assert.match(hints[0], /db:preflight:warn/);
  });
});

test("buildExternalListingsDbOperatorHints empty when DATABASE_URL unset", async () => {
  await withTemporaryEnv({ DATABASE_URL: undefined }, () => {
    const hints = buildExternalListingsDbOperatorHints({
      lastAttemptAt: TIMESTAMP,
      dbUpsertCount: 0,
      upsertErrors: [],
    });

    assert.deepEqual(hints, []);
  });
});

test("buildSyncOperatorHints merges db upsert remediation", async () => {
  await withTemporaryEnv({ DATABASE_URL: "postgresql://example" }, () => {
    const hints = buildSyncOperatorHints(
      [
        {
          key: DISCOVER_KEY,
          source: "discover",
          category: "slabs",
          label: "GRAILS partner listings (sync:discover)",
          status: "success",
          lastAttemptAt: TIMESTAMP,
          lastSuccessAt: TIMESTAMP,
          ageMinutes: 5,
          isStale: false,
          detail: "CC 4; Phygitals 2; total 6",
        },
      ],
      120,
      {
        lastAttemptAt: TIMESTAMP,
        dbUpsertCount: 0,
        upsertErrors: [],
      },
    );

    assert.equal(
      hints.some((hint) => hint.includes("db:preflight:warn")),
      true,
    );
  });
});
