import assert from "node:assert/strict";
import { readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import test from "node:test";

import { getAdminOpsStatus } from "../lib/admin-ops-status";
import { getExternalListingsDbSyncLeg } from "../lib/data-sync";
import { jsonError } from "../lib/api-errors";
import { setPrismaClientHasBundledQueryEngineForTests } from "../lib/db-connection";
import { getRecentOperatorFailures } from "../lib/operator-diagnostics";
import { schemaHealthNonBlockingQueryResults, withMockedQueryRaw } from "./helpers/prisma-test-utils";

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

test("jsonError returns structured envelope and records operator failure", async () => {
  const request = new Request("http://localhost/api/marketplace/reserve", {
    method: "POST",
  });

  const response = jsonError({
    request,
    status: 409,
    code: "RESERVE_CONFLICT",
    message: "Slab is already reserved",
    details: { slabId: "slab_1" },
  });

  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.equal(body.code, "RESERVE_CONFLICT");
  assert.equal(body.error, "Slab is already reserved");
  assert.equal(body.path, "/api/marketplace/reserve");
  assert.equal(typeof body.requestId, "string");
  assert.equal(typeof body.timestamp, "string");
  assert.deepEqual(body.details, { slabId: "slab_1" });

  const [latestFailure] = getRecentOperatorFailures(1);
  assert.ok(latestFailure);
  assert.equal(latestFailure.code, "RESERVE_CONFLICT");
  assert.equal(latestFailure.route, "/api/marketplace/reserve");
});

test("getAdminOpsStatus includes env checks and remediation pointers", async () => {
  const previousValues = {
    DATABASE_URL: process.env.DATABASE_URL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SOLANA_RPC: process.env.NEXT_PUBLIC_SOLANA_RPC,
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
    SYNC_API_TOKEN: process.env.SYNC_API_TOKEN,
  };

  process.env.DATABASE_URL = "postgresql://example";
  process.env.ADMIN_PASSWORD = "secret";
  process.env.NEXTAUTH_SECRET = "next-auth-secret";
  process.env.CRON_SECRET = "cron-secret";
  process.env.NEXT_PUBLIC_SITE_URL = "https://slabvault.fi";
  process.env.NEXT_PUBLIC_SOLANA_RPC = "https://rpc.test";
  process.env.SYNC_API_TOKEN = "sync-secret";

  try {
    const status = await withMockedQueryRaw(
      schemaHealthNonBlockingQueryResults(),
      async () => getAdminOpsStatus(),
    );

    assert.equal(typeof status.generatedAt, "string");
    assert.ok(status.checks.length >= 6);
    assert.equal(status.checks.some((check) => check.key === "database-url"), true);
    assert.equal(status.checks.some((check) => check.key === "database-url-protocol"), true);
    assert.equal(status.checks.some((check) => check.key === "schema-health"), true);
    assert.equal(status.checks.some((check) => check.key === "discover-aggregator"), true);
    assert.equal(status.checks.some((check) => check.key === "external-listings-seed"), true);
    assert.equal(
      status.checks.some((check) => check.key === "external-listings-db-sync"),
      true,
    );
    assert.ok(status.remediationPointers.length >= 1);
  } finally {
    process.env.DATABASE_URL = previousValues.DATABASE_URL;
    process.env.ADMIN_PASSWORD = previousValues.ADMIN_PASSWORD;
    process.env.NEXTAUTH_SECRET = previousValues.NEXTAUTH_SECRET;
    process.env.CRON_SECRET = previousValues.CRON_SECRET;
    process.env.NEXT_PUBLIC_SITE_URL = previousValues.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SOLANA_RPC = previousValues.NEXT_PUBLIC_SOLANA_RPC;
    process.env.SOLANA_RPC_URL = previousValues.SOLANA_RPC_URL;
    process.env.SYNC_API_TOKEN = previousValues.SYNC_API_TOKEN;
  }
});

test("getAdminOpsStatus warns when DATABASE_URL protocol is unsupported", async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousAdminPassword = process.env.ADMIN_PASSWORD;

  process.env.DATABASE_URL = "mysql://example";
  process.env.ADMIN_PASSWORD = "secret";

  try {
    const status = await withMockedQueryRaw(
      schemaHealthNonBlockingQueryResults(),
      async () => getAdminOpsStatus(),
    );

    const protocolCheck = status.checks.find(
      (check) => check.key === "database-url-protocol",
    );
    assert.ok(protocolCheck);
    assert.equal(protocolCheck.status, "warn");
    assert.match(protocolCheck.detail, /ExternalListing DB upsert is skipped/i);
    assert.match(protocolCheck.remediation ?? "", /postgresql:\/\//);
    assert.match(protocolCheck.remediation ?? "", /prisma\+postgres:\/\//);
    assert.ok(
      status.remediationPointers.some((pointer) =>
        pointer.includes("DATABASE_URL protocol"),
      ),
    );
  } finally {
    process.env.DATABASE_URL = previousDatabaseUrl;
    process.env.ADMIN_PASSWORD = previousAdminPassword;
  }
});

test("getAdminOpsStatus warns when postgresql:// mismatches no-engine Prisma Client", async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousAdminPassword = process.env.ADMIN_PASSWORD;

  process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/svf";
  process.env.ADMIN_PASSWORD = "secret";
  setPrismaClientHasBundledQueryEngineForTests(false);

  try {
    const status = await withMockedQueryRaw(
      schemaHealthNonBlockingQueryResults(),
      async () => getAdminOpsStatus(),
    );

    const protocolCheck = status.checks.find(
      (check) => check.key === "database-url-protocol",
    );
    assert.ok(protocolCheck);
    assert.equal(protocolCheck.status, "warn");
    assert.match(protocolCheck.detail, /without a query engine/i);
    assert.match(protocolCheck.remediation ?? "", /prisma\+postgres:\/\//);
  } finally {
    setPrismaClientHasBundledQueryEngineForTests(null);
    process.env.DATABASE_URL = previousDatabaseUrl;
    process.env.ADMIN_PASSWORD = previousAdminPassword;
  }
});

test("getExternalListingsDbSyncLeg reads persisted upsert count from site.json", async () => {
  await withPreservedSiteJson(async () => {
    const site = JSON.parse(await readFile(SITE_PATH, "utf-8")) as Record<
      string,
      unknown
    >;
    site.lastExternalListingsDbUpsertCount = 12;
    site.lastExternalListingsCcIngestSource = "cached";
    site.lastExternalListingsSyncErrors = [];
    site.syncDiagnostics = {
      [DISCOVER_KEY]: {
        lastAttemptAt: "2026-05-22T10:00:00.000Z",
        lastSuccessAt: "2026-05-22T10:00:00.000Z",
        lastStatus: "success",
        detail: "CC 4; Phygitals 2; total 6; db upsert 12",
      },
    };
    await writeFile(SITE_PATH, JSON.stringify(site, null, 2), "utf-8");

    const leg = await getExternalListingsDbSyncLeg();
    assert.equal(leg.dbUpsertCount, 12);
    assert.equal(leg.ccIngestSource, "cached");
    assert.equal(leg.lastAttemptAt, "2026-05-22T10:00:00.000Z");
    assert.equal(leg.lastStatus, "success");
    assert.deepEqual(leg.upsertErrors, []);
  });
});

test("getAdminOpsStatus warns when DATABASE_URL set but dbUpsertCount is zero", async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;

  process.env.DATABASE_URL = "postgresql://example";

  try {
    await withPreservedSiteJson(async () => {
      const site = JSON.parse(await readFile(SITE_PATH, "utf-8")) as Record<
        string,
        unknown
      >;
      site.lastExternalListingsDbUpsertCount = 0;
      site.lastExternalListingsSyncErrors = [];
      site.syncDiagnostics = {
        [DISCOVER_KEY]: {
          lastAttemptAt: "2026-05-22T10:00:00.000Z",
          lastSuccessAt: "2026-05-22T10:00:00.000Z",
          lastStatus: "success",
          detail: "CC 4; Phygitals 2; total 6",
        },
      };
      await writeFile(SITE_PATH, JSON.stringify(site, null, 2), "utf-8");

      const status = await withMockedQueryRaw(
        schemaHealthNonBlockingQueryResults(),
        async () => getAdminOpsStatus(),
      );
      const dbSync = status.checks.find(
        (check) => check.key === "external-listings-db-sync",
      );
      assert.ok(dbSync);
      assert.equal(dbSync.status, "warn");
      assert.match(dbSync.detail, /dbUpsertCount=0/);
    });
  } finally {
    process.env.DATABASE_URL = previousDatabaseUrl;
  }
});

test("getAdminOpsStatus warns when DATABASE_URL set and upsert errors recorded", async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;

  process.env.DATABASE_URL = "postgresql://example";

  try {
    await withPreservedSiteJson(async () => {
      const site = JSON.parse(await readFile(SITE_PATH, "utf-8")) as Record<
        string,
        unknown
      >;
      site.lastExternalListingsDbUpsertCount = 0;
      site.lastExternalListingsSyncErrors = [
        "External listing DB upsert failed unexpectedly.",
      ];
      site.syncDiagnostics = {
        [DISCOVER_KEY]: {
          lastAttemptAt: "2026-05-22T10:00:00.000Z",
          lastSuccessAt: null,
          lastStatus: "failure",
          detail: "warnings: External listing DB upsert failed unexpectedly.",
        },
      };
      await writeFile(SITE_PATH, JSON.stringify(site, null, 2), "utf-8");

      const status = await withMockedQueryRaw(
        schemaHealthNonBlockingQueryResults(),
        async () => getAdminOpsStatus(),
      );
      const dbSync = status.checks.find(
        (check) => check.key === "external-listings-db-sync",
      );
      assert.ok(dbSync);
      assert.equal(dbSync.status, "warn");
      assert.match(dbSync.detail, /upsert errors:/i);
    });
  } finally {
    process.env.DATABASE_URL = previousDatabaseUrl;
  }
});

test("getAdminOpsStatus passes when DATABASE_URL set and last db upsert succeeded", async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;

  process.env.DATABASE_URL = "postgresql://example";

  try {
    await withPreservedSiteJson(async () => {
      const site = JSON.parse(await readFile(SITE_PATH, "utf-8")) as Record<
        string,
        unknown
      >;
      site.lastExternalListingsDbUpsertCount = 8;
      site.lastExternalListingsCcIngestSource = "api";
      site.lastExternalListingsSyncErrors = [];
      site.syncDiagnostics = {
        [DISCOVER_KEY]: {
          lastAttemptAt: "2026-05-22T10:00:00.000Z",
          lastSuccessAt: "2026-05-22T10:00:00.000Z",
          lastStatus: "success",
          detail: "CC 4; Phygitals 2; total 6; db upsert 8",
        },
      };
      await writeFile(SITE_PATH, JSON.stringify(site, null, 2), "utf-8");

      const status = await withMockedQueryRaw(
        schemaHealthNonBlockingQueryResults(),
        async () => getAdminOpsStatus(),
      );
      const dbSync = status.checks.find(
        (check) => check.key === "external-listings-db-sync",
      );
      assert.ok(dbSync);
      assert.equal(dbSync.status, "pass");
      assert.match(dbSync.detail, /upserted 8 ExternalListing row/);
      assert.match(dbSync.detail, /CC ingest: api/);
    });
  } finally {
    process.env.DATABASE_URL = previousDatabaseUrl;
  }
});
