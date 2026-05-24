import { PrismaClient } from "@prisma/client";

import {
  inspectSchemaHealth,
  isLikelyLocalDevelopmentDatabase,
} from "../lib/schema-health";

const BASELINE_MIGRATION = "00000000000000_manual_baseline";

function printHeader(title: string) {
  console.log(`\n=== ${title} ===`);
}

function printList(title: string, items: string[]) {
  console.log(`\n${title}`);
  if (items.length === 0) {
    console.log("- (none)");
    return;
  }
  for (const item of items) {
    console.log(`- ${item}`);
  }
}

async function main() {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    console.error("DATABASE_URL is required to build a baseline plan.");
    process.exit(1);
  }

  const jsonOutput = process.argv.includes("--json");
  const prisma = new PrismaClient();

  try {
    const report = await inspectSchemaHealth({ forceRefresh: true });
    const safeLocal = isLikelyLocalDevelopmentDatabase(dbUrl);

    const tableRows = await prisma.$queryRaw<
      Array<{ table_name: string }>
    >`SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()`;
    const tableNames = new Set(tableRows.map((row) => row.table_name));

    const domainTables = [
      "Slab",
      "Transaction",
      "PricingHistory",
      "User",
      "Account",
      "Session",
      "VerificationToken",
    ];
    const existingDomainTables = domainTables.filter((name) => tableNames.has(name));
    const likelyNonEmptyDomainSchema = existingDomainTables.length > 0;
    const hasMigrationTable = report.migrationTablePresent === true;

    const plan = {
      generatedAt: new Date().toISOString(),
      scenario: report.scenario,
      severity: report.severity,
      hasMigrationTable,
      existingDomainTables,
      paymentSplitDrift:
        report.missingColumns.includes("paymentSplit") ||
        report.missingPaymentSplitValues.length > 0
          ? "yes"
          : report.migrationTablePresent === null
            ? "unknown"
            : "no",
      safeLocalRepair: report.safeLocalRepair,
      recommendedCommands: report.recommendedCommands,
      operatorRunbook: report.operatorRunbook,
      p3005Likely:
        !hasMigrationTable && likelyNonEmptyDomainSchema ? true : false,
    };

    if (jsonOutput) {
      console.log(JSON.stringify(plan, null, 2));
      return;
    }

    printHeader("Database Migration Baseline Plan");
    console.log(`Scenario: ${report.scenario}`);
    console.log(`Preflight severity: ${report.severity}`);
    console.log(`Migration table present: ${hasMigrationTable ? "yes" : "no"}`);
    console.log(
      `Detected domain tables: ${
        existingDomainTables.length > 0 ? existingDomainTables.join(", ") : "none"
      }`,
    );
    console.log(`Transaction.paymentSplit drift: ${plan.paymentSplitDrift}`);
    if (report.safeLocalRepair != null) {
      console.log(
        `Safe local db push repair: ${report.safeLocalRepair ? "yes (disposable local DB only)" : "no"}`,
      );
    }

    if (plan.p3005Likely) {
      console.log(
        "\nP3005 context: prisma migrate dev/deploy against this non-empty database requires baseline first.",
      );
      console.log(
        "Symptom: `The database schema is not empty` (P3005) when running migrate dev on existing tables.",
      );
    }

    if (plan.paymentSplitDrift === "yes") {
      console.log(
        "\nPaymentSplit drift detected. Run npm run db:repair:payment-split:plan for targeted repair steps.",
      );
      if (!hasMigrationTable && safeLocal) {
        console.log(
          "Local fast path (disposable DB only): npm run db:push, then npm run db:preflight.",
        );
      }
    }

    if (hasMigrationTable) {
      console.log(
        "\nNo baseline action required: _prisma_migrations already exists.",
      );
      if (report.pendingMigrations.length > 0) {
        console.log(
          `Pending migrations: ${report.pendingMigrations.join(", ")}`,
        );
      }
      console.log("Next steps:");
      console.log("- npx prisma migrate deploy");
      console.log("- npm run db:preflight");
      return;
    }

    if (!likelyNonEmptyDomainSchema) {
      console.log(
        "\nNo marketplace tables found. Use normal migration flow instead of baseline:",
      );
      console.log("- npx prisma migrate dev --name init");
      console.log("- npm run db:preflight");
      return;
    }

    console.log(
      "\nNon-empty schema without _prisma_migrations detected. Follow the safe baseline runbook:",
    );
    console.log("- docs/runbooks/migration-baseline.md");
    printList("Operator confirmation required before proceeding", [
      "Confirm a fresh DB backup exists.",
      "Confirm no one is writing schema changes during baseline.",
      "Pause checkout/reservation writes on production-like environments.",
    ]);
    printList("Suggested command sequence", [
      `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/${BASELINE_MIGRATION}/migration.sql`,
      `npx prisma migrate resolve --applied ${BASELINE_MIGRATION}`,
      "npx prisma migrate deploy",
      "npm run db:preflight",
      "npm run db:repair:payment-split:plan",
    ]);

    if (safeLocal) {
      console.log(
        "\nLocal-only alternative (no migration history, disposable DB): npm run db:push && npm run db:preflight",
      );
    }

    printList("Operator runbook", report.operatorRunbook);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("db-baseline-plan failed:", error);
  process.exit(1);
});
