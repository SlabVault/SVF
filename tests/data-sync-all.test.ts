import assert from "node:assert/strict";
import { readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import test from "node:test";

import { syncAllData } from "@/lib/data-sync";
import type { SyncExternalListingsResult } from "@/lib/external-listings-sync";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE_PATH = join(ROOT, "data", "site.json");
const DISCOVER_KEY = "external-listings:discover";

function mockExternalSyncResult(
  overrides: Partial<SyncExternalListingsResult> = {},
): SyncExternalListingsResult {
  return {
    success: true,
    collectorCryptCount: 4,
    phygitalsCount: 2,
    manualPreserved: 0,
    totalWritten: 6,
    dbUpsertCount: 0,
    ccIngestSource: "scrape",
    dbConfigured: false,
    errors: [],
    ...overrides,
  };
}

async function withPreservedSiteJson<R>(run: () => Promise<R> | R): Promise<R> {
  const before = await readFile(SITE_PATH, "utf-8");
  try {
    return await run();
  } finally {
    await writeFile(SITE_PATH, before, "utf-8");
  }
}

test("syncAllData reports external-listings:discover in sourceStatuses", async () => {
  await withPreservedSiteJson(async () => {
    const result = await syncAllData({
      skipUpstreamSync: true,
      externalSyncToJson: async () => mockExternalSyncResult(),
    });

    assert.equal(result.externalListingsUpdated, true);
    assert.equal(result.externalListingsWritten, 6);
    assert.equal(result.success, true);
    assert.equal(result.slabsUpdated, false);

      const discover = result.sourceStatuses.find(
        (status) => status.key === DISCOVER_KEY,
      );
      assert.ok(discover);
      assert.equal(discover.source, "discover");
      assert.equal(discover.category, "slabs");
      assert.equal(discover.label, "GRAILS partner listings (sync:discover)");
      assert.equal(discover.status, "success");
      assert.match(discover.detail, /CC 4/);
      assert.match(discover.detail, /Phygitals 2/);
      assert.match(discover.detail, /total 6/);
      assert.equal(discover.lastAttemptAt, result.timestamp);
    assert.equal(discover.lastSuccessAt, result.timestamp);

    const site = JSON.parse(await readFile(SITE_PATH, "utf-8")) as Record<
      string,
      unknown
    >;
    assert.equal(site.lastExternalListingsCcIngestSource, "scrape");
  });
});

test("syncAllData persists ccIngestSource api when partner sync uses CC API", async () => {
  await withPreservedSiteJson(async () => {
    await syncAllData({
      skipUpstreamSync: true,
      externalSyncToJson: async () =>
        mockExternalSyncResult({ ccIngestSource: "api" }),
    });

    const site = JSON.parse(await readFile(SITE_PATH, "utf-8")) as Record<
      string,
      unknown
    >;
    assert.equal(site.lastExternalListingsCcIngestSource, "api");
  });
});

test("syncAllData marks discover failure when partner sync errors", async () => {
  await withPreservedSiteJson(async () => {
    const result = await syncAllData({
      skipUpstreamSync: true,
      externalSyncToJson: async () =>
        mockExternalSyncResult({
          success: false,
          collectorCryptCount: 0,
          phygitalsCount: 0,
          totalWritten: 0,
          errors: ["Collector Crypt sync failed unexpectedly."],
        }),
    });

    assert.equal(result.externalListingsUpdated, false);
    assert.equal(
      result.errors.some((error) =>
        error.includes("Collector Crypt sync failed"),
      ),
      true,
    );

    const discover = result.sourceStatuses.find(
      (status) => status.key === DISCOVER_KEY,
    );
    assert.ok(discover);
    assert.equal(discover.status, "failure");
    assert.match(discover.detail, /CC 0/);
    assert.match(discover.detail, /total 0/);
  });
});
