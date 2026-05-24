import assert from "node:assert/strict";
import { readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import test from "node:test";

import { GET as syncGet } from "../app/api/sync/route";
import {
  applyCcIngestSourceToDiscoverDetail,
  evaluateSyncSourceStatuses,
  getSyncStatus,
} from "../lib/data-sync";
import { withTemporaryEnv } from "./helpers/test-helpers";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE_PATH = join(ROOT, "data", "site.json");
const DISCOVER_KEY = "external-listings:discover";

async function withPreservedSiteJson<R>(run: () => Promise<R> | R): Promise<R> {
  const before = await readFile(SITE_PATH, "utf-8");
  try {
    return await run();
  } finally {
    await writeFile(SITE_PATH, before, "utf-8");
  }
}

test("evaluateSyncSourceStatuses registers external-listings:discover", () => {
  const statuses = evaluateSyncSourceStatuses(
    undefined,
    "2026-05-20T12:00:00.000Z",
    120,
  );

  const discover = statuses.find((status) => status.key === DISCOVER_KEY);
  assert.ok(discover);
  assert.equal(discover.source, "discover");
  assert.equal(discover.category, "slabs");
  assert.equal(discover.label, "GRAILS partner listings (sync:discover)");
  assert.equal(discover.status, "unknown");
  assert.equal(discover.detail, "No sync attempt recorded yet.");
});

test("evaluateSyncSourceStatuses reflects discover diagnostics", () => {
  const statuses = evaluateSyncSourceStatuses(
    {
      [DISCOVER_KEY]: {
        lastAttemptAt: "2026-05-20T11:00:00.000Z",
        lastSuccessAt: "2026-05-20T11:00:00.000Z",
        lastStatus: "success",
        detail: "CC 12 (api); Phygitals 8; total 20",
      },
    },
    "2026-05-20T12:00:00.000Z",
    120,
  );

  const discover = statuses.find((status) => status.key === DISCOVER_KEY);
  assert.ok(discover);
  assert.equal(discover.status, "success");
  assert.equal(discover.lastSuccessAt, "2026-05-20T11:00:00.000Z");
  assert.equal(discover.ageMinutes, 60);
  assert.equal(discover.isStale, false);
  assert.match(discover.detail, /CC 12 \(api\)/);
});

test("applyCcIngestSourceToDiscoverDetail suffixes legacy CC counts", () => {
  assert.equal(
    applyCcIngestSourceToDiscoverDetail(
      "CC 12; Phygitals 8; total 20",
      "api",
    ),
    "CC 12 (api); Phygitals 8; total 20",
  );
  assert.equal(
    applyCcIngestSourceToDiscoverDetail(
      "CC 12 (scrape); Phygitals 8; total 20",
      "api",
    ),
    "CC 12 (scrape); Phygitals 8; total 20",
  );
});

test("getSyncStatus discover detail includes ccIngestSource suffix from site metadata", async () => {
  await withPreservedSiteJson(async () => {
    const site = {
      lastExternalListingsCcIngestSource: "api",
      syncDiagnostics: {
        [DISCOVER_KEY]: {
          lastAttemptAt: "2026-05-22T10:00:00.000Z",
          lastSuccessAt: "2026-05-22T10:00:00.000Z",
          lastStatus: "success",
          detail: "CC 12; Phygitals 8; total 20",
        },
      },
    };
    await writeFile(SITE_PATH, JSON.stringify(site, null, 2), "utf-8");

    const status = await getSyncStatus();
    const discover = status.sourceStatuses.find(
      (entry) => entry.key === DISCOVER_KEY,
    );
    assert.ok(discover);
    assert.match(discover.detail, /CC 12 \(api\)/);
  });
});

test("getSyncStatus includes external-listings:discover in sourceStatuses", async () => {
  const status = await getSyncStatus();

  assert.ok(Array.isArray(status.sourceStatuses));
  const discover = status.sourceStatuses.find(
    (entry) => entry.key === DISCOVER_KEY,
  );
  assert.ok(discover);
  assert.equal(discover.source, "discover");
  assert.ok(Array.isArray(status.operatorHints));
});

test("sync GET status payload includes external-listings:discover", async () => {
  await withTemporaryEnv({ CRON_SECRET: "cron-secret" }, async () => {
    const request = new Request("http://localhost/api/sync", {
      headers: { authorization: "Bearer cron-secret" },
    });
    const response = await syncGet(request);
    const body = await response.json();

    assert.equal(response.status, 200);
    const discover = body.sourceStatuses?.find(
      (entry: { key: string }) => entry.key === DISCOVER_KEY,
    );
    assert.ok(discover);
    assert.equal(discover.key, DISCOVER_KEY);
    assert.equal(discover.source, "discover");
    assert.equal(discover.category, "slabs");
  });
});

test("sync GET discover status detail includes ccIngestSource suffix from site metadata", async () => {
  await withPreservedSiteJson(async () => {
    const site = {
      lastExternalListingsCcIngestSource: "api",
      syncDiagnostics: {
        [DISCOVER_KEY]: {
          lastAttemptAt: "2026-05-22T10:00:00.000Z",
          lastSuccessAt: "2026-05-22T10:00:00.000Z",
          lastStatus: "success",
          detail: "CC 12; Phygitals 8; total 20",
        },
      },
    };
    await writeFile(SITE_PATH, JSON.stringify(site, null, 2), "utf-8");

    await withTemporaryEnv({ CRON_SECRET: "cron-secret" }, async () => {
      const request = new Request("http://localhost/api/sync", {
        headers: { authorization: "Bearer cron-secret" },
      });
      const response = await syncGet(request);
      const body = await response.json();

      assert.equal(response.status, 200);
      const discover = body.sourceStatuses?.find(
        (entry: { key: string }) => entry.key === DISCOVER_KEY,
      );
      assert.ok(discover);
      assert.match(discover.detail, /CC 12 \(api\)/);
    });
  });
});
