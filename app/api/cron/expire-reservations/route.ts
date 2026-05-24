import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api-errors";
import { releaseExpiredReservations } from "@/lib/marketplace-reservations";
import {
  getMigrationRecoveryHint,
  isPrismaMissingColumnError,
} from "@/lib/prisma-compat";
import { getBlockingSchemaIssue } from "@/lib/schema-health";
import { requireCronAuth } from "@/lib/sync-auth";

/**
 * POST /api/cron/expire-reservations - Release stale RESERVED slabs.
 */
export async function POST(request: Request) {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  try {
    const schemaIssue = await getBlockingSchemaIssue();
    if (schemaIssue) {
      return jsonError({
        request,
        status: 503,
        code: "CRON_EXPIRE_RESERVATIONS_SCHEMA_BLOCKING",
        message: schemaIssue.error,
        details: schemaIssue.details,
        recoveryHint: schemaIssue.recoveryHint,
      });
    }

    const result = await releaseExpiredReservations();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error expiring reservations:", error);

    if (isPrismaMissingColumnError(error, "paymentSplit")) {
      return jsonError({
        request,
        status: 503,
        code: "CRON_EXPIRE_RESERVATIONS_SCHEMA_DRIFT",
        message: "Database schema is behind and missing Transaction.paymentSplit.",
        recoveryHint: getMigrationRecoveryHint(),
      });
    }

    return jsonError({
      request,
      status: 500,
      code: "CRON_EXPIRE_RESERVATIONS_INTERNAL_ERROR",
      message: "Failed to expire reservations",
      details: {
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    });
  }
}
