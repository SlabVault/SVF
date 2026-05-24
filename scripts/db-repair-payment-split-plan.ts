import { PrismaClient } from "@prisma/client";

import { inspectSchemaHealth } from "../lib/schema-health";

const PAYMENT_SPLIT_BACKFILL_MIGRATION =
  "20260520223500_transaction_schema_backfill";

function printHeader(title: string) {
  console.log(`\n=== ${title} ===`);
}

function printList(title: string, items: string[]) {
  console.log(`\n${title}`);
  for (const item of items) {
    console.log(`- ${item}`);
  }
}

async function main() {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    console.error("DATABASE_URL is required to inspect paymentSplit drift.");
    process.exit(1);
  }

  const jsonOutput = process.argv.includes("--json");
  const prisma = new PrismaClient();

  try {
    await prisma.$queryRaw`SELECT 1`;

    const tableRows = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name = 'Transaction'
    `;

    const report = await inspectSchemaHealth({ forceRefresh: true });

    if (tableRows.length === 0) {
      const emptyPlan = {
        generatedAt: new Date().toISOString(),
        scenario: report.scenario,
        transactionTablePresent: false,
        operatorRunbook: [
          "Run npx prisma migrate deploy on an empty/new database.",
          "Verify with npm run db:preflight.",
        ],
        recommendedCommands: ["npx prisma migrate deploy", "npm run db:preflight"],
      };

      if (jsonOutput) {
        console.log(JSON.stringify(emptyPlan, null, 2));
        return;
      }

      printHeader("PaymentSplit Repair Plan");
      console.log("Transaction table not found. Run normal migrations first:");
      printList("Recommended commands", emptyPlan.recommendedCommands);
      return;
    }

    const paymentSplitColumns = [
      "paymentSplit",
      "listPriceUsdSnapshot",
      "reservedExpiresAt",
      "solPaidAt",
    ];
    const missingPaymentSplitColumns = report.missingColumns.filter((column) =>
      paymentSplitColumns.includes(column),
    );
    const hasDrift =
      missingPaymentSplitColumns.length > 0 ||
      report.missingPaymentSplitValues.length > 0;

    const plan = {
      generatedAt: new Date().toISOString(),
      scenario: report.scenario,
      severity: report.severity,
      migrationTablePresent: report.migrationTablePresent,
      missingColumns: missingPaymentSplitColumns,
      missingPaymentSplitValues: report.missingPaymentSplitValues,
      hasDrift,
      safeLocalRepair: report.safeLocalRepair,
      operatorRunbook: report.operatorRunbook,
      recommendedCommands: report.recommendedCommands,
      backfillMigration: PAYMENT_SPLIT_BACKFILL_MIGRATION,
    };

    if (jsonOutput) {
      console.log(JSON.stringify(plan, null, 2));
      return;
    }

    printHeader("PaymentSplit Drift Repair Plan");
    console.log(`Scenario: ${report.scenario}`);
    console.log(`Preflight severity: ${report.severity}`);
    console.log(
      `Migration table present: ${report.migrationTablePresent ? "yes" : "no"}`,
    );
    console.log(
      `Missing Transaction columns: ${
        missingPaymentSplitColumns.length > 0
          ? missingPaymentSplitColumns.join(", ")
          : "none"
      }`,
    );
    console.log(
      `Missing PaymentSplit enum values: ${
        report.missingPaymentSplitValues.length > 0
          ? report.missingPaymentSplitValues.join(", ")
          : "none"
      }`,
    );

    if (!hasDrift) {
      console.log("\nNo paymentSplit drift detected. Run npm run db:preflight for full checks.");
      return;
    }

    console.log(
      "\nBlocking drift detected. Checkout and reservation cron may fail until repaired.",
    );

    if (report.scenario === "payment_split_drift_untracked") {
      console.log(
        "\nUntracked drift (no _prisma_migrations). Choose one path:",
      );
      if (report.safeLocalRepair) {
        console.log("Local fast path (disposable dev DB only):");
        printList("Commands", ["npm run db:push", "npm run db:preflight"]);
      }
      console.log("Preferred path for shared/prod-like databases:");
      printList("Commands", [
        "npm run db:baseline:plan",
        "Follow docs/runbooks/migration-baseline.md",
        "npx prisma migrate deploy",
        "npm run db:preflight",
      ]);
      console.log(
        "\nP3005 note: do not run migrate dev on this non-empty DB until baseline is resolved.",
      );
    } else if (report.scenario === "payment_split_drift") {
      printList("Recommended operator sequence", [
        "Back up the database.",
        "Pause checkout/reservation writes if this is production.",
        "npx prisma migrate deploy",
        "npm run db:preflight",
        "npm run db:repair:payment-split:plan",
      ]);
      console.log(
        `\nIf migrate deploy reports applied but columns are still missing, inspect _prisma_migrations against prisma/migrations/${PAYMENT_SPLIT_BACKFILL_MIGRATION}/migration.sql before manual SQL.`,
      );
    } else {
      printList("Recommended operator sequence", report.operatorRunbook);
    }

    printList("Smoke checks after repair", [
      "GET /api/admin/schema-health (admin auth)",
      "POST /api/marketplace/reserve then checkout flow",
      "POST /api/cron/expire-reservations (CRON_SECRET bearer)",
    ]);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("db-repair-payment-split-plan failed:", error);
  process.exit(1);
});
