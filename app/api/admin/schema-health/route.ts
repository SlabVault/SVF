import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAdminRole, requireAuth } from "@/lib/admin-auth";
import { inspectSchemaHealth } from "@/lib/schema-health";

export const dynamic = "force-dynamic";

type CheckStatus = "pass" | "warn" | "fail" | "unknown";

function toCheckStatus(ok: boolean, blocking: boolean): CheckStatus {
  if (ok) return "pass";
  return blocking ? "fail" : "warn";
}

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const roleError = await requireAdminRole(request, ["admin"]);
  if (roleError) return roleError;

  const schemaHealth = await inspectSchemaHealth({ forceRefresh: true });
  const isBlocking = schemaHealth.severity === "blocking";

  const checks = [
    {
      key: "required-transaction-columns",
      label: "Required Transaction columns",
      status: toCheckStatus(schemaHealth.missingColumns.length === 0, isBlocking),
      detail:
        schemaHealth.missingColumns.length === 0
          ? "All required columns are present."
          : `Missing: ${schemaHealth.missingColumns.join(", ")}`,
    },
    {
      key: "payment-split-enum-values",
      label: "PaymentSplit enum values",
      status: toCheckStatus(
        schemaHealth.missingPaymentSplitValues.length === 0,
        isBlocking,
      ),
      detail:
        schemaHealth.missingPaymentSplitValues.length === 0
          ? "All required PaymentSplit values are present."
          : `Missing: ${schemaHealth.missingPaymentSplitValues.join(", ")}`,
    },
    {
      key: "transaction-status-enum-values",
      label: "TransactionStatus enum values",
      status: toCheckStatus(
        schemaHealth.missingTransactionStatusValues.length === 0,
        isBlocking,
      ),
      detail:
        schemaHealth.missingTransactionStatusValues.length === 0
          ? "All required TransactionStatus values are present."
          : `Missing: ${schemaHealth.missingTransactionStatusValues.join(", ")}`,
    },
    {
      key: "migration-history-table",
      label: "Migration history table",
      status:
        schemaHealth.migrationTablePresent == null
          ? "unknown"
          : schemaHealth.migrationTablePresent
            ? "pass"
            : "warn",
      detail:
        schemaHealth.migrationTablePresent == null
          ? "Not checked."
          : schemaHealth.migrationTablePresent
            ? "_prisma_migrations is present."
            : "_prisma_migrations is missing (baseline required).",
    },
    {
      key: "pending-migrations",
      label: "Pending repository migrations",
      status: schemaHealth.pendingMigrations.length === 0 ? "pass" : "warn",
      detail:
        schemaHealth.pendingMigrations.length === 0
          ? "No pending migrations detected."
          : `Pending: ${schemaHealth.pendingMigrations.join(", ")}`,
    },
  ] as const;

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    isBlocking,
    scenario: schemaHealth.scenario,
    safeLocalRepair: schemaHealth.safeLocalRepair,
    recommendedCommands: schemaHealth.recommendedCommands,
    operatorRunbook: schemaHealth.operatorRunbook,
    schemaHealth,
    checks,
  });
}
