import assert from "node:assert/strict";
import test from "node:test";

import {
  classifySchemaDriftScenario,
  formatSchemaHealthForConsole,
  getBlockingSchemaIssue,
  inspectSchemaHealth,
  isLikelyLocalDevelopmentDatabase,
  resetSchemaHealthCache,
} from "../lib/schema-health";
import {
  hasTransactionPaymentSplitColumn,
  isPrismaMissingColumnError,
} from "../lib/prisma-compat";
import { prisma } from "../lib/prisma";
import {
  createPrismaKnownRequestError,
  schemaHealthBlockingUntrackedQueryResults,
  withMockedQueryRaw,
} from "./helpers/prisma-test-utils";
import { withTemporaryEnv } from "./helpers/test-helpers";

test("inspectSchemaHealth reports payment_split_drift_untracked when column missing and no migration table", async () => {
  try {
    await withTemporaryEnv(
      { NODE_ENV: "test", DATABASE_URL: "postgresql://localhost:5432/svf" },
      async () => {
        await withMockedQueryRaw(
          schemaHealthBlockingUntrackedQueryResults(),
          async () => {
            const report = await inspectSchemaHealth({ forceRefresh: true });

            assert.equal(report.severity, "blocking");
            assert.equal(report.scenario, "payment_split_drift_untracked");
            assert.ok(report.missingColumns.includes("paymentSplit"));
            assert.equal(report.migrationTablePresent, false);
            assert.equal(report.safeLocalRepair, true);
            assert.ok(report.operatorRunbook.length > 0);
            assert.ok(report.recommendedCommands.includes("npm run db:push"));

            const blockingIssue = await getBlockingSchemaIssue();
            assert.ok(blockingIssue);
            assert.match(blockingIssue.error, /schema drift/i);
            assert.ok(
              blockingIssue.details.some((detail) =>
                detail.includes("Missing Transaction columns: paymentSplit"),
              ),
            );
            assert.ok(
              blockingIssue.details.some((detail) =>
                detail.includes("_prisma_migrations"),
              ),
            );

            const consoleOutput = formatSchemaHealthForConsole(report);
            assert.match(consoleOutput, /Scenario: payment_split_drift_untracked/);
            assert.match(consoleOutput, /Missing columns: paymentSplit/);
            assert.match(consoleOutput, /Operator runbook:/);
          },
        );
      },
    );
  } finally {
    resetSchemaHealthCache();
  }
});

test("classifySchemaDriftScenario maps pending migrations to warning scenario", () => {
  const scenario = classifySchemaDriftScenario({
    severity: "warning",
    missingColumns: [],
    missingPaymentSplitValues: [],
    missingTransactionStatusValues: [],
    migrationTablePresent: true,
    pendingMigrations: ["20260520223500_transaction_schema_backfill"],
  });

  assert.equal(scenario, "pending_migrations");
});

test("classifySchemaDriftScenario maps tracked payment split drift", () => {
  const scenario = classifySchemaDriftScenario({
    severity: "blocking",
    missingColumns: ["paymentSplit"],
    missingPaymentSplitValues: [],
    missingTransactionStatusValues: [],
    migrationTablePresent: true,
    pendingMigrations: [],
  });

  assert.equal(scenario, "payment_split_drift");
});

test("isLikelyLocalDevelopmentDatabase detects localhost URLs outside production", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";

  try {
    assert.equal(
      isLikelyLocalDevelopmentDatabase("postgresql://user:pass@localhost:5432/svf"),
      true,
    );
    assert.equal(
      isLikelyLocalDevelopmentDatabase("postgresql://user:pass@db.prod.example/svf"),
      false,
    );
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
  }
});

test("isPrismaMissingColumnError detects paymentSplit column drift", () => {
  const missingPaymentSplit = createPrismaKnownRequestError(
    "P2022",
    "Transaction.paymentSplit",
  );
  const duplicate = createPrismaKnownRequestError("P2002", "paymentSplit");

  assert.equal(isPrismaMissingColumnError(missingPaymentSplit), true);
  assert.equal(
    isPrismaMissingColumnError(missingPaymentSplit, "paymentSplit"),
    true,
  );
  assert.equal(isPrismaMissingColumnError(duplicate, "paymentSplit"), false);
});

test("hasTransactionPaymentSplitColumn returns null without DATABASE_URL", async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  try {
    const hasColumn = await hasTransactionPaymentSplitColumn();
    assert.equal(hasColumn, null);
  } finally {
    process.env.DATABASE_URL = previousDatabaseUrl;
  }
});

test("hasTransactionPaymentSplitColumn falls back to null on query failure", async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://example";

  const prismaWithRaw = prisma as unknown as {
    $queryRaw: (...args: unknown[]) => Promise<unknown>;
  };
  const originalQueryRaw = prismaWithRaw.$queryRaw;
  prismaWithRaw.$queryRaw = async () => {
    throw new Error("query failed");
  };

  try {
    const hasColumn = await hasTransactionPaymentSplitColumn();
    assert.equal(hasColumn, null);
  } finally {
    prismaWithRaw.$queryRaw = originalQueryRaw;
    process.env.DATABASE_URL = previousDatabaseUrl;
  }
});
