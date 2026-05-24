import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateSyncSourceStatuses,
  syncExternalListings,
} from "../lib/data-sync";
import type { SyncExternalListingsResult } from "../lib/external-listings-sync";

const TIMESTAMP = "2026-05-22T12:00:00.000Z";

type SyncDiagnostics = Parameters<typeof syncExternalListings>[0];

function mockSyncResult(
  overrides: Partial<SyncExternalListingsResult> = {},
): SyncExternalListingsResult {
  return {
    success: true,
    collectorCryptCount: 2,
    phygitalsCount: 1,
    manualPreserved: 0,
    totalWritten: 3,
    dbUpsertCount: 0,
    ccIngestSource: "scrape",
    dbConfigured: false,
    errors: [],
    ...overrides,
  };
}

test("syncExternalListings marks updated when json sync writes rows", async () => {
  const diagnostics = {} as SyncDiagnostics;
  const outcome = await syncExternalListings(
    diagnostics,
    TIMESTAMP,
    async () => mockSyncResult(),
  );

  assert.equal(outcome.updated, true);
  assert.equal(outcome.written, 3);
  assert.equal(outcome.dbUpsertCount, 0);
  assert.deepEqual(outcome.errors, []);

  const statuses = evaluateSyncSourceStatuses(diagnostics, TIMESTAMP, 120);
  const discover = statuses.find(
    (status) => status.key === "external-listings:discover",
  );
  assert.ok(discover);
  assert.equal(discover.status, "success");
  assert.match(discover.detail, /CC 2/);
  assert.match(discover.detail, /Phygitals 1/);
  assert.match(discover.detail, /total 3/);
});

test("syncExternalListings treats db upsert only as updated", async () => {
  const diagnostics = {} as SyncDiagnostics;
  const outcome = await syncExternalListings(
    diagnostics,
    TIMESTAMP,
    async () =>
      mockSyncResult({ totalWritten: 0, dbUpsertCount: 4, collectorCryptCount: 0 }),
  );

  assert.equal(outcome.updated, true);
  assert.equal(outcome.written, 0);
  assert.equal(outcome.dbUpsertCount, 4);

  const statuses = evaluateSyncSourceStatuses(diagnostics, TIMESTAMP, 120);
  const discover = statuses.find(
    (status) => status.key === "external-listings:discover",
  );
  assert.ok(discover);
  assert.equal(discover.status, "success");
  assert.match(discover.detail, /db upsert 4/);
});

test("syncExternalListings records failure when json sync reports errors", async () => {
  const diagnostics = {} as SyncDiagnostics;
  const outcome = await syncExternalListings(
    diagnostics,
    TIMESTAMP,
    async () =>
      mockSyncResult({
        success: false,
        totalWritten: 0,
        collectorCryptCount: 0,
        phygitalsCount: 0,
        errors: ["Collector Crypt sync failed unexpectedly."],
      }),
  );

  assert.equal(outcome.updated, false);
  assert.deepEqual(outcome.errors, [
    "GRAILS partner listings (sync:discover): Collector Crypt sync failed unexpectedly.",
  ]);

  const statuses = evaluateSyncSourceStatuses(diagnostics, TIMESTAMP, 120);
  const discover = statuses.find(
    (status) => status.key === "external-listings:discover",
  );
  assert.ok(discover);
  assert.equal(discover.status, "failure");
});

test("syncExternalListings surfaces thrown errors without secrets", async () => {
  const diagnostics = {} as SyncDiagnostics;
  const outcome = await syncExternalListings(
    diagnostics,
    TIMESTAMP,
    async () => {
      throw new Error("partner ingest unavailable");
    },
  );

  assert.equal(outcome.updated, false);
  assert.deepEqual(outcome.errors, [
    "GRAILS partner listings (sync:discover) failed after 3/3 attempts: partner ingest unavailable",
  ]);

  const statuses = evaluateSyncSourceStatuses(diagnostics, TIMESTAMP, 120);
  const discover = statuses.find(
    (status) => status.key === "external-listings:discover",
  );
  assert.ok(discover);
  assert.equal(discover.status, "failure");
  assert.match(discover.detail, /3\/3 attempts/);
  assert.match(discover.detail, /partner ingest unavailable/);
});
