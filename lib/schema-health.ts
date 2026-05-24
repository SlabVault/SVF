import { readdir } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";
import {
  getDatabaseUrl,
  isDirectPostgresDatabaseUrl,
  isPrismaProxyDatabaseUrl,
} from "@/lib/db-connection";

const TRANSACTION_REQUIRED_COLUMNS = [
  "paymentSplit",
  "listPriceUsdSnapshot",
  "reservedExpiresAt",
  "solPaidAt",
  "fulfillmentSignature",
  "fulfilledAt",
] as const;

const PAYMENT_SPLIT_DRIFT_COLUMNS = [
  "paymentSplit",
  "listPriceUsdSnapshot",
  "reservedExpiresAt",
  "solPaidAt",
] as const;

const PAYMENT_SPLIT_REQUIRED_VALUES = ["FIXED_DUAL", "SOL_80_SVF_20"] as const;
const TRANSACTION_STATUS_REQUIRED_VALUES = ["PENDING_FULFILLMENT"] as const;

const PAYMENT_SPLIT_BACKFILL_MIGRATION =
  "20260520223500_transaction_schema_backfill";
const BASELINE_MIGRATION = "00000000000000_manual_baseline";

export type SchemaHealthSeverity =
  | "ok"
  | "warning"
  | "blocking"
  | "unconfigured"
  | "unreachable";

export type SchemaDriftScenario =
  | "ok"
  | "unconfigured"
  | "unreachable"
  | "baseline_required"
  | "payment_split_drift"
  | "payment_split_drift_untracked"
  | "schema_drift"
  | "pending_migrations";

export type SchemaHealthReport = {
  severity: SchemaHealthSeverity;
  scenario: SchemaDriftScenario;
  summary: string;
  recoveryHint: string;
  remediationSteps: string[];
  operatorRunbook: string[];
  recommendedCommands: string[];
  safeLocalRepair: boolean | null;
  missingColumns: string[];
  missingPaymentSplitValues: string[];
  missingTransactionStatusValues: string[];
  migrationTablePresent: boolean | null;
  pendingMigrations: string[];
  detail?: string;
};

const CACHE_TTL_MS = 15_000;
let cachedReport: { at: number; report: SchemaHealthReport } | null = null;

/** Clears in-process schema health cache (for tests and post-migration operators). */
export function resetSchemaHealthCache(): void {
  cachedReport = null;
}

export function isLikelyLocalDevelopmentDatabase(url: string | null): boolean {
  if (!url) return false;
  if (process.env.NODE_ENV === "production") return false;

  const normalized = url.toLowerCase();
  if (
    normalized.includes("localhost") ||
    normalized.includes("127.0.0.1") ||
    normalized.includes("@db:5432") ||
    normalized.includes("host.docker.internal")
  ) {
    return true;
  }

  return isPrismaProxyDatabaseUrl(url);
}

function hasPaymentSplitDrift(report: {
  missingColumns: string[];
  missingPaymentSplitValues: string[];
}): boolean {
  const missingPaymentSplitColumns = report.missingColumns.filter((column) =>
    (PAYMENT_SPLIT_DRIFT_COLUMNS as readonly string[]).includes(column),
  );
  return (
    missingPaymentSplitColumns.length > 0 ||
    report.missingPaymentSplitValues.length > 0
  );
}

export function classifySchemaDriftScenario(input: {
  severity: SchemaHealthSeverity;
  missingColumns: string[];
  missingPaymentSplitValues: string[];
  missingTransactionStatusValues: string[];
  migrationTablePresent: boolean | null;
  pendingMigrations: string[];
}): SchemaDriftScenario {
  if (input.severity === "unconfigured") return "unconfigured";
  if (input.severity === "unreachable") return "unreachable";
  if (input.severity === "ok") return "ok";

  const blocking =
    input.missingColumns.length > 0 ||
    input.missingPaymentSplitValues.length > 0 ||
    input.missingTransactionStatusValues.length > 0;

  if (blocking) {
    const paymentSplitDrift = hasPaymentSplitDrift(input);
    if (paymentSplitDrift && input.migrationTablePresent === false) {
      return "payment_split_drift_untracked";
    }
    if (paymentSplitDrift) return "payment_split_drift";
    return "schema_drift";
  }

  if (input.migrationTablePresent === false) return "baseline_required";
  if (input.pendingMigrations.length > 0) return "pending_migrations";
  return "ok";
}

function buildOperatorRunbook(
  scenario: SchemaDriftScenario,
  options: {
    safeLocalRepair: boolean | null;
    pendingMigrations: string[];
  },
): { remediationSteps: string[]; operatorRunbook: string[]; recommendedCommands: string[]; recoveryHint: string } {
  switch (scenario) {
    case "unconfigured":
      return {
        recoveryHint:
          "Set DATABASE_URL to enable live checkout data and migration checks.",
        remediationSteps: [
          "Set DATABASE_URL in .env.local.",
          "Run npm run db:preflight after configuring the database.",
        ],
        operatorRunbook: [
          "Copy .env.example to .env.local and set DATABASE_URL.",
          "Run npm run db:preflight.",
        ],
        recommendedCommands: ["npm run db:preflight"],
      };
    case "unreachable":
      return {
        recoveryHint:
          "DATABASE_URL is set but the database is unreachable. Verify connectivity and credentials.",
        remediationSteps: [
          "Check DATABASE_URL credentials and network access.",
          "If using prisma+postgres locally, run npx prisma dev.",
          "Retry npm run db:preflight.",
        ],
        operatorRunbook: [
          "Verify DATABASE_URL host, port, user, password, and SSL mode.",
          "For Prisma local proxy URLs, start the dev database with npx prisma dev.",
          "Re-run npm run db:preflight.",
        ],
        recommendedCommands: ["npx prisma dev", "npm run db:preflight"],
      };
    case "payment_split_drift_untracked":
      return {
        recoveryHint:
          "PaymentSplit drift with no migration history. Run npm run db:preflight, then baseline the DB before deploy, or use local db push on disposable dev databases only.",
        remediationSteps: options.safeLocalRepair
          ? [
              "Local-only fast path: npm run db:push (disposable dev DB only).",
              "Preferred path for shared/prod-like DBs: npm run db:baseline:plan, then follow docs/runbooks/migration-baseline.md.",
              "Verify with npm run db:preflight and npm run db:repair:payment-split:plan.",
            ]
          : [
              "Do not use db push on shared or production databases.",
              "Run npm run db:baseline:plan and follow docs/runbooks/migration-baseline.md.",
              "After baseline resolve + migrate deploy, verify with npm run db:preflight.",
            ],
        operatorRunbook: options.safeLocalRepair
          ? [
              "Confirm this is a disposable local database (backup optional but recommended).",
              "Fast local repair: npm run db:push",
              "Alternative with migration history: npm run db:baseline:plan, then follow docs/runbooks/migration-baseline.md.",
              "Verify: npm run db:preflight && npm run db:repair:payment-split:plan",
              "Smoke test reserve -> checkout and GET /api/admin/schema-health.",
            ]
          : [
              "Create and verify a fresh database backup.",
              "Pause checkout/reservation writes if this environment serves real users.",
              "Run npm run db:baseline:plan",
              "Follow docs/runbooks/migration-baseline.md (resolve baseline, then migrate deploy).",
              "Verify: npm run db:preflight && npm run db:repair:payment-split:plan",
            ],
        recommendedCommands: options.safeLocalRepair
          ? ["npm run db:push", "npm run db:preflight"]
          : [
              "npm run db:baseline:plan",
              `npx prisma migrate resolve --applied ${BASELINE_MIGRATION}`,
              "npx prisma migrate deploy",
              "npm run db:preflight",
            ],
      };
    case "payment_split_drift":
      return {
        recoveryHint:
          "PaymentSplit drift detected with migration history present. Run npm run db:preflight and apply forward-only migrations with migrate deploy.",
        remediationSteps: [
          "Run npm run db:repair:payment-split:plan for environment-specific guidance.",
          "Apply migrations: npx prisma migrate deploy",
          "If deploy succeeds but columns remain missing, inspect _prisma_migrations against the backfill migration SQL.",
          "Verify with npm run db:preflight.",
        ],
        operatorRunbook: [
          "Back up the database before schema changes.",
          "Run npm run db:repair:payment-split:plan",
          "Apply forward-only migrations: npx prisma migrate deploy",
          `Confirm migration ${PAYMENT_SPLIT_BACKFILL_MIGRATION} is recorded and columns exist.`,
          "Verify: npm run db:preflight",
          "Smoke test reserve -> checkout and POST /api/cron/expire-reservations.",
        ],
        recommendedCommands: [
          "npm run db:repair:payment-split:plan",
          "npx prisma migrate deploy",
          "npm run db:preflight",
        ],
      };
    case "schema_drift":
      return {
        recoveryHint:
          "Schema drift detected. Apply npx prisma migrate deploy; use npm run db:push only on disposable local databases.",
        remediationSteps: [
          "Apply migrations with npx prisma migrate deploy.",
          "For local development-only databases, you may use npm run db:push.",
          "Re-run npm run db:preflight until it reports OK.",
        ],
        operatorRunbook: [
          "Back up the database if it contains non-disposable data.",
          options.safeLocalRepair
            ? "Local-only option: npm run db:push"
            : "Use npx prisma migrate deploy (avoid db push outside local dev).",
          "Verify with npm run db:preflight.",
        ],
        recommendedCommands: options.safeLocalRepair
          ? ["npx prisma migrate deploy", "npm run db:push", "npm run db:preflight"]
          : ["npx prisma migrate deploy", "npm run db:preflight"],
      };
    case "baseline_required":
      return {
        recoveryHint:
          "Non-empty schema without _prisma_migrations (Prisma P3005 context). Baseline before migrate dev/deploy on existing data.",
        remediationSteps: [
          "Review docs/runbooks/migration-baseline.md before changing migration history.",
          "Back up the database (required operator step).",
          "Run npm run db:baseline:plan and follow the printed commands.",
          "After baseline marking, run npx prisma migrate deploy.",
          "Verify with npm run db:preflight.",
        ],
        operatorRunbook: [
          "If npx prisma migrate dev fails with P3005, stop — the database is non-empty without migration history.",
          "Create and verify a fresh database backup.",
          "Run npm run db:baseline:plan",
          "Generate baseline SQL, review it, then npx prisma migrate resolve --applied for the baseline folder.",
          "Run npx prisma migrate deploy, then npm run db:preflight.",
        ],
        recommendedCommands: [
          "npm run db:baseline:plan",
          `npx prisma migrate resolve --applied ${BASELINE_MIGRATION}`,
          "npx prisma migrate deploy",
          "npm run db:preflight",
        ],
      };
    case "pending_migrations":
      return {
        recoveryHint: `Pending migrations detected${options.pendingMigrations.length > 0 ? `: ${options.pendingMigrations.join(", ")}` : ""}.`,
        remediationSteps: [
          "Apply migrations with npx prisma migrate deploy.",
          "Re-run npm run db:preflight until severity is ok.",
        ],
        operatorRunbook: [
          "Apply forward-only migrations: npx prisma migrate deploy",
          "Verify: npm run db:preflight",
        ],
        recommendedCommands: ["npx prisma migrate deploy", "npm run db:preflight"],
      };
    case "ok":
    default:
      return {
        recoveryHint: "No drift detected.",
        remediationSteps: [],
        operatorRunbook: [],
        recommendedCommands: [],
      };
  }
}

function summaryForScenario(
  scenario: SchemaDriftScenario,
  blocking: boolean,
  pendingMigrations: string[],
): string {
  switch (scenario) {
    case "unconfigured":
      return "DATABASE_URL is not configured.";
    case "unreachable":
      return "Database is unreachable.";
    case "payment_split_drift_untracked":
      return "PaymentSplit schema drift detected without migration history (blocking).";
    case "payment_split_drift":
      return "PaymentSplit schema drift detected (blocking).";
    case "schema_drift":
      return "Database schema drift detected (blocking).";
    case "baseline_required":
      return "Schema exists but _prisma_migrations is missing (P3005 baseline required).";
    case "pending_migrations":
      return pendingMigrations.length > 0
        ? `Pending migrations detected: ${pendingMigrations.join(", ")}.`
        : "Pending migrations detected in repository.";
    case "ok":
      return "Schema preflight passed.";
    default:
      return blocking
        ? "Database schema drift detected (blocking)."
        : "Schema preflight warning.";
  }
}

function unreachableHintFromUrl(url: string | null): string {
  if (!url) return "Set DATABASE_URL and rerun preflight.";
  if (isPrismaProxyDatabaseUrl(url)) {
    return "DATABASE_URL uses a Prisma proxy. For local development, run npx prisma dev first or switch to direct postgresql:// URL.";
  }
  return "DATABASE_URL is set but the database is unreachable. Verify connectivity and credentials.";
}

async function readExpectedMigrationNames(): Promise<string[]> {
  try {
    const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
    const entries = await readdir(migrationsDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

export function getMigrationRecoveryHint(): string {
  return "Run `npm run db:preflight` for scenario-specific guidance. PaymentSplit drift: `npm run db:repair:payment-split:plan`. Missing _prisma_migrations (P3005): `npm run db:baseline:plan` + docs/runbooks/migration-baseline.md. Local dev-only repair: `npm run db:push`.";
}

export async function inspectSchemaHealth(options?: {
  forceRefresh?: boolean;
}): Promise<SchemaHealthReport> {
  const now = Date.now();
  if (
    !options?.forceRefresh &&
    cachedReport &&
    now - cachedReport.at < CACHE_TTL_MS
  ) {
    return cachedReport.report;
  }

  const url = getDatabaseUrl();
  if (!url) {
    const guidance = buildOperatorRunbook("unconfigured", {
      safeLocalRepair: null,
      pendingMigrations: [],
    });
    const report: SchemaHealthReport = {
      severity: "unconfigured",
      scenario: "unconfigured",
      summary: summaryForScenario("unconfigured", false, []),
      recoveryHint: guidance.recoveryHint,
      remediationSteps: guidance.remediationSteps,
      operatorRunbook: guidance.operatorRunbook,
      recommendedCommands: guidance.recommendedCommands,
      safeLocalRepair: null,
      missingColumns: [],
      missingPaymentSplitValues: [],
      missingTransactionStatusValues: [],
      migrationTablePresent: null,
      pendingMigrations: [],
    };
    cachedReport = { at: now, report };
    return report;
  }

  const safeLocalRepair = isLikelyLocalDevelopmentDatabase(url);

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const guidance = buildOperatorRunbook("unreachable", {
      safeLocalRepair,
      pendingMigrations: [],
    });
    const report: SchemaHealthReport = {
      severity: "unreachable",
      scenario: "unreachable",
      summary: summaryForScenario("unreachable", false, []),
      recoveryHint: unreachableHintFromUrl(url),
      remediationSteps: guidance.remediationSteps,
      operatorRunbook: guidance.operatorRunbook,
      recommendedCommands: guidance.recommendedCommands,
      safeLocalRepair,
      missingColumns: [],
      missingPaymentSplitValues: [],
      missingTransactionStatusValues: [],
      migrationTablePresent: null,
      pendingMigrations: [],
      detail,
    };
    cachedReport = { at: now, report };
    return report;
  }

  const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'Transaction'
  `;
  const columnSet = new Set(columns.map((c) => c.column_name));
  const missingColumns = TRANSACTION_REQUIRED_COLUMNS.filter(
    (column) => !columnSet.has(column),
  );

  const paymentSplitEnumRows = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
    SELECT e.enumlabel
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PaymentSplit'
  `;
  const paymentSplitSet = new Set(paymentSplitEnumRows.map((r) => r.enumlabel));
  const missingPaymentSplitValues = PAYMENT_SPLIT_REQUIRED_VALUES.filter(
    (value) => !paymentSplitSet.has(value),
  );

  const transactionStatusRows = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
    SELECT e.enumlabel
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'TransactionStatus'
  `;
  const transactionStatusSet = new Set(
    transactionStatusRows.map((r) => r.enumlabel),
  );
  const missingTransactionStatusValues = TRANSACTION_STATUS_REQUIRED_VALUES.filter(
    (value) => !transactionStatusSet.has(value),
  );

  const migrationTableCheck = await prisma.$queryRaw<
    Array<{ migration_table: string | null }>
  >`SELECT to_regclass('"_prisma_migrations"')::text AS migration_table`;
  const migrationTablePresent = Boolean(migrationTableCheck[0]?.migration_table);

  const pendingMigrations: string[] = [];
  if (migrationTablePresent) {
    const expectedMigrationNames = await readExpectedMigrationNames();
    const appliedRows = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name
      FROM "_prisma_migrations"
      WHERE rolled_back_at IS NULL
    `;
    const applied = new Set(appliedRows.map((row) => row.migration_name));
    for (const migrationName of expectedMigrationNames) {
      if (!applied.has(migrationName)) pendingMigrations.push(migrationName);
    }
  }

  const hasBlockingIssue =
    missingColumns.length > 0 ||
    missingPaymentSplitValues.length > 0 ||
    missingTransactionStatusValues.length > 0;

  let severity: SchemaHealthSeverity = "ok";
  if (hasBlockingIssue) {
    severity = "blocking";
  } else if (!migrationTablePresent || pendingMigrations.length > 0) {
    severity = "warning";
  }

  const scenario = classifySchemaDriftScenario({
    severity,
    missingColumns: [...missingColumns],
    missingPaymentSplitValues: [...missingPaymentSplitValues],
    missingTransactionStatusValues: [...missingTransactionStatusValues],
    migrationTablePresent,
    pendingMigrations,
  });

  const guidance = buildOperatorRunbook(scenario, {
    safeLocalRepair,
    pendingMigrations,
  });

  const report: SchemaHealthReport = {
    severity,
    scenario,
    summary: summaryForScenario(scenario, hasBlockingIssue, pendingMigrations),
    recoveryHint:
      severity === "blocking" || severity === "warning"
        ? guidance.recoveryHint
        : guidance.recoveryHint,
    remediationSteps: guidance.remediationSteps,
    operatorRunbook: guidance.operatorRunbook,
    recommendedCommands: guidance.recommendedCommands,
    safeLocalRepair:
      scenario === "payment_split_drift_untracked" ||
      scenario === "schema_drift" ||
      scenario === "baseline_required"
        ? safeLocalRepair
        : null,
    missingColumns: [...missingColumns],
    missingPaymentSplitValues: [...missingPaymentSplitValues],
    missingTransactionStatusValues: [...missingTransactionStatusValues],
    migrationTablePresent,
    pendingMigrations,
  };

  cachedReport = { at: now, report };
  return report;
}

export async function getBlockingSchemaIssue(): Promise<{
  error: string;
  recoveryHint: string;
  details: string[];
} | null> {
  const report = await inspectSchemaHealth();
  if (report.severity !== "blocking") return null;

  const details: string[] = [];
  if (report.missingColumns.length > 0) {
    details.push(`Missing Transaction columns: ${report.missingColumns.join(", ")}`);
  }
  if (report.missingPaymentSplitValues.length > 0) {
    details.push(
      `Missing PaymentSplit enum values: ${report.missingPaymentSplitValues.join(", ")}`,
    );
  }
  if (report.missingTransactionStatusValues.length > 0) {
    details.push(
      `Missing TransactionStatus enum values: ${report.missingTransactionStatusValues.join(", ")}`,
    );
  }
  if (report.scenario === "payment_split_drift_untracked") {
    details.push(
      "Migration history missing (_prisma_migrations). Use baseline runbook or local db push only on disposable dev databases.",
    );
  }

  return {
    error: "Database schema drift detected. Checkout is temporarily disabled.",
    recoveryHint: report.recoveryHint,
    details,
  };
}

export function formatSchemaHealthForConsole(report: SchemaHealthReport): string {
  const lines: string[] = [];
  lines.push(`Schema preflight severity: ${report.severity}`);
  lines.push(`Scenario: ${report.scenario}`);
  lines.push(`Summary: ${report.summary}`);
  lines.push(`Hint: ${report.recoveryHint}`);

  if (report.missingColumns.length > 0) {
    lines.push(`Missing columns: ${report.missingColumns.join(", ")}`);
  }
  if (report.missingPaymentSplitValues.length > 0) {
    lines.push(
      `Missing PaymentSplit values: ${report.missingPaymentSplitValues.join(", ")}`,
    );
  }
  if (report.missingTransactionStatusValues.length > 0) {
    lines.push(
      `Missing TransactionStatus values: ${report.missingTransactionStatusValues.join(", ")}`,
    );
  }
  if (report.migrationTablePresent === false) {
    lines.push("Migration table: _prisma_migrations missing (P3005 baseline context)");
  } else if (report.migrationTablePresent === true) {
    lines.push("Migration table: present");
  }
  if (report.pendingMigrations.length > 0) {
    lines.push(`Pending migrations: ${report.pendingMigrations.join(", ")}`);
  }
  if (report.safeLocalRepair != null) {
    lines.push(
      `Safe local repair (db push): ${report.safeLocalRepair ? "yes — disposable local DB only" : "no — use baseline + migrate deploy"}`,
    );
  }
  if (report.detail) {
    lines.push(`Detail: ${report.detail}`);
  }
  if (report.recommendedCommands.length > 0) {
    lines.push("Recommended commands:");
    for (const command of report.recommendedCommands) {
      lines.push(`- ${command}`);
    }
  }
  if (report.operatorRunbook.length > 0) {
    lines.push("Operator runbook:");
    report.operatorRunbook.forEach((step, index) => {
      lines.push(`${index + 1}. ${step}`);
    });
  }
  if (report.remediationSteps.length > 0) {
    lines.push("Remediation:");
    for (const step of report.remediationSteps) {
      lines.push(`- ${step}`);
    }
  }

  return lines.join("\n");
}

export function isDirectPostgresUrlForOps(url: string | null): boolean {
  return Boolean(url && isDirectPostgresDatabaseUrl(url));
}
