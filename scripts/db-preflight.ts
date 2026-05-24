import {
  formatSchemaHealthForConsole,
  inspectSchemaHealth,
} from "../lib/schema-health";

type ExitMode = "strict" | "warn-only";
type OutputMode = "text" | "json";

function parseExitMode(): ExitMode {
  return process.argv.includes("--warn-only") ? "warn-only" : "strict";
}

function parseOutputMode(): OutputMode {
  return process.argv.includes("--json") ? "json" : "text";
}

async function main() {
  const mode = parseExitMode();
  const outputMode = parseOutputMode();
  const report = await inspectSchemaHealth({ forceRefresh: true });

  if (outputMode === "json") {
    console.log(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          mode,
          report,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(formatSchemaHealthForConsole(report));
    if (report.scenario === "payment_split_drift_untracked") {
      console.log("");
      console.log(
        "PaymentSplit drift without migration history: run npm run db:repair:payment-split:plan for the full operator sequence.",
      );
    }
    if (report.scenario === "baseline_required") {
      console.log("");
      console.log(
        "P3005 context: npx prisma migrate dev on a non-empty DB without _prisma_migrations will fail. Use npm run db:baseline:plan instead.",
      );
    }
  }

  const shouldFail =
    mode === "strict" &&
    (report.severity === "warning" || report.severity === "blocking");

  if (shouldFail) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("db-preflight failed:", error);
  process.exit(1);
});
