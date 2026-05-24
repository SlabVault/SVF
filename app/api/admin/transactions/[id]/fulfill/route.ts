import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole, requireWriteAuth } from "@/lib/admin-auth";
import {
  getMigrationRecoveryHint,
  isPrismaMissingColumnError,
} from "@/lib/prisma-compat";
import { getBlockingSchemaIssue } from "@/lib/schema-health";
import {
  canTransitionTransactionStatus,
  getAllowedTransactionTransitions,
} from "@/lib/transaction-state";
import { jsonError } from "@/lib/api-errors";

function respondWithError(
  request: Request,
  status: number,
  message: string,
  code: string,
  details?: unknown,
  recoveryHint?: string,
) {
  return jsonError({
    request,
    status,
    code,
    message,
    details,
    recoveryHint,
  });
}

/**
 * PATCH /api/admin/transactions/:id/fulfill - Mark slab fulfillment complete
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireWriteAuth(request);
  if (authError) return authError;

  const roleError = await requireAdminRole(request, ["admin"]);
  if (roleError) return roleError;

  try {
    const schemaIssue = await getBlockingSchemaIssue();
    if (schemaIssue) {
      return respondWithError(
        request,
        503,
        schemaIssue.error,
        "FULFILL_SCHEMA_BLOCKING",
        schemaIssue.details,
        schemaIssue.recoveryHint,
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const fulfillmentSignature =
      typeof body.fulfillmentSignature === "string"
        ? body.fulfillmentSignature.trim()
        : undefined;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      return respondWithError(
        request,
        404,
        "Transaction not found",
        "FULFILL_TRANSACTION_NOT_FOUND",
        { transactionId: id },
      );
    }

    if (transaction.status === "COMPLETED") {
      if (
        fulfillmentSignature &&
        transaction.fulfillmentSignature &&
        transaction.fulfillmentSignature !== fulfillmentSignature
      ) {
        return respondWithError(
          request,
          409,
          "Fulfillment signature mismatch on already-completed transaction.",
          "FULFILL_IDEMPOTENCY_SIGNATURE_MISMATCH",
          {
            transactionId: id,
            existingFulfillmentSignature: transaction.fulfillmentSignature,
            providedFulfillmentSignature: fulfillmentSignature,
          },
        );
      }

      const finalizedTransaction =
        fulfillmentSignature && !transaction.fulfillmentSignature
          ? await prisma.transaction.update({
              where: { id },
              data: { fulfillmentSignature },
              include: { slab: true },
            })
          : await prisma.transaction.findUnique({
              where: { id },
              include: { slab: true },
            });

      if (!finalizedTransaction) {
        return respondWithError(
          request,
          500,
          "Transaction missing during idempotent fulfillment replay.",
          "FULFILL_REPLAY_NOT_FOUND",
          { transactionId: id },
        );
      }

      return NextResponse.json({
        ...finalizedTransaction,
        idempotentReplay: true,
      });
    }

    if (!canTransitionTransactionStatus(transaction.status, "COMPLETED")) {
      return respondWithError(
        request,
        409,
        `Cannot fulfill transaction with status ${transaction.status}`,
        "FULFILL_ILLEGAL_STATUS_TRANSITION",
        {
          transactionId: id,
          currentStatus: transaction.status,
          requestedStatus: "COMPLETED",
          allowedTransitions: getAllowedTransactionTransitions(transaction.status),
        },
      );
    }

    const fulfilledAt = new Date();
    const transition = await prisma.transaction.updateMany({
      where: { id, status: "PENDING_FULFILLMENT" },
      data: {
        status: "COMPLETED",
        fulfillmentSignature: fulfillmentSignature || transaction.fulfillmentSignature,
        fulfilledAt,
      },
    });

    if (transition.count === 0) {
      const latest = await prisma.transaction.findUnique({
        where: { id },
        include: { slab: true },
      });

      if (latest?.status === "COMPLETED") {
        return NextResponse.json({
          ...latest,
          idempotentReplay: true,
        });
      }

      return respondWithError(
        request,
        409,
        "Transaction changed during fulfillment update. Retry after refreshing state.",
        "FULFILL_STATE_CONFLICT",
        {
          transactionId: id,
          latestStatus: latest?.status ?? null,
        },
      );
    }

    const updated = await prisma.transaction.findUnique({
      where: { id },
      include: { slab: true },
    });

    if (!updated) {
      return respondWithError(
        request,
        500,
        "Transaction missing after fulfillment update.",
        "FULFILL_POST_UPDATE_NOT_FOUND",
        { transactionId: id },
      );
    }

    await prisma.slab.updateMany({
      where: { id: transaction.slabId },
      data: { status: "SOLD" },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (isPrismaMissingColumnError(error, "paymentSplit")) {
      return respondWithError(
        request,
        503,
        "Database schema is behind and missing required transaction fields.",
        "FULFILL_SCHEMA_MISSING_FIELDS",
        undefined,
        getMigrationRecoveryHint(),
      );
    }

    console.error("Error marking fulfillment complete:", error);
    return respondWithError(
      request,
      500,
      "Failed to update fulfillment status",
      "FULFILL_INTERNAL_ERROR",
      {
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    );
  }
}
