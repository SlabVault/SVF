import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyCheckoutPayments } from "@/lib/marketplace-payment-verify";
import { attemptAutoFulfillment } from "@/lib/marketplace-fulfillment";
import {
  isReservationExpired,
  releaseExpiredReservations,
} from "@/lib/marketplace-reservations";
import {
  getMigrationRecoveryHint,
  isPrismaMissingColumnError,
} from "@/lib/prisma-compat";
import { getBlockingSchemaIssue } from "@/lib/schema-health";
import {
  canTransitionTransactionStatus,
  getAllowedTransactionTransitions,
  isCheckoutIdempotentState,
} from "@/lib/transaction-state";
import { jsonError } from "@/lib/api-errors";
import { requireCsrfProtection } from "@/lib/csrf";

type ErrorDetails = unknown;

function respondWithError(
  request: Request,
  status: number,
  message: string,
  code: string,
  details?: ErrorDetails,
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
 * POST /api/marketplace/checkout - Confirm split payment and queue fulfillment
 */
export async function POST(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const schemaIssue = await getBlockingSchemaIssue();
    if (schemaIssue) {
      return respondWithError(
        request,
        503,
        schemaIssue.error,
        "CHECKOUT_SCHEMA_BLOCKING",
        schemaIssue.details,
        schemaIssue.recoveryHint,
      );
    }

    await releaseExpiredReservations();

    const body = await request.json().catch(() => null);
    const transactionId =
      body && typeof body.transactionId === "string"
        ? body.transactionId.trim()
        : "";
    const transactionSignature =
      body && typeof body.transactionSignature === "string"
        ? body.transactionSignature.trim()
        : "";
    const burnSignature =
      body && typeof body.burnSignature === "string"
        ? body.burnSignature.trim()
        : "";

    if (!transactionId || !transactionSignature || !burnSignature) {
      return respondWithError(
        request,
        400,
        "transactionId, transactionSignature, and burnSignature are required",
        "CHECKOUT_INVALID_INPUT",
      );
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { slab: true },
    });

    if (!transaction) {
      return respondWithError(
        request,
        404,
        "Transaction not found",
        "CHECKOUT_TRANSACTION_NOT_FOUND",
        { transactionId },
      );
    }

    if (transaction.status !== "PENDING") {
      if (
        isCheckoutIdempotentState(transaction.status) &&
        transaction.transactionSignature === transactionSignature &&
        transaction.burnSignature === burnSignature
      ) {
        return NextResponse.json({
          ...transaction,
          idempotentReplay: true,
        });
      }

      return respondWithError(
        request,
        409,
        `Transaction is ${transaction.status}, not pending checkout`,
        "CHECKOUT_ILLEGAL_STATUS",
        {
          transactionId: transaction.id,
          currentStatus: transaction.status,
          allowedTransitions: getAllowedTransactionTransitions(transaction.status),
        },
      );
    }

    if (isReservationExpired(transaction.reservedExpiresAt)) {
      await prisma.$transaction([
        prisma.transaction.updateMany({
          where: { id: transaction.id, status: "PENDING" },
          data: { status: "CANCELLED" },
        }),
        prisma.slab.updateMany({
          where: { id: transaction.slabId, status: "RESERVED" },
          data: { status: "AVAILABLE" },
        }),
      ]);

      return respondWithError(
        request,
        409,
        "Reservation expired. Please reserve the slab again.",
        "CHECKOUT_RESERVATION_EXPIRED",
        {
          transactionId: transaction.id,
          reservedExpiresAt: transaction.reservedExpiresAt?.toISOString() ?? null,
        },
      );
    }

    const replay = await prisma.transaction.findFirst({
      where: {
        id: { not: transaction.id },
        OR: [
          { transactionSignature },
          { burnSignature },
        ],
      },
      select: { id: true },
    });

    if (replay) {
      return respondWithError(
        request,
        409,
        "One or more signatures were already used by another checkout.",
        "CHECKOUT_SIGNATURE_REPLAY",
        {
          transactionId: transaction.id,
          replayTransactionId: replay.id,
        },
      );
    }

    const verification = await verifyCheckoutPayments(
      transactionSignature,
      burnSignature,
      transaction.buyerWallet,
      transaction.solAmount,
      transaction.svfAmount,
    );

    if (!verification.ok) {
      return respondWithError(
        request,
        400,
        verification.error || "Payment verification failed",
        "CHECKOUT_PAYMENT_VERIFICATION_FAILED",
        { transactionId: transaction.id },
      );
    }

    const fulfillment = await attemptAutoFulfillment({
      transactionId: transaction.id,
      buyerWallet: transaction.buyerWallet,
      slabId: transaction.slabId,
    });

    const nextStatus = fulfillment.autoFulfilled ? "COMPLETED" : "PENDING_FULFILLMENT";

    if (!canTransitionTransactionStatus(transaction.status, nextStatus)) {
      return respondWithError(
        request,
        409,
        `Illegal transaction status transition ${transaction.status} -> ${nextStatus}`,
        "CHECKOUT_ILLEGAL_STATUS_TRANSITION",
        {
          transactionId: transaction.id,
          currentStatus: transaction.status,
          requestedStatus: nextStatus,
          allowedTransitions: getAllowedTransactionTransitions(transaction.status),
        },
      );
    }

    const completionTime = new Date();
    const updateResult = await prisma.transaction.updateMany({
      where: { id: transactionId, status: "PENDING" },
      data: {
        transactionSignature,
        burnSignature,
        fulfillmentSignature: fulfillment.fulfillmentSignature,
        status: nextStatus,
        solPaidAt: transaction.solPaidAt ?? completionTime,
        completedAt: completionTime,
        fulfilledAt: fulfillment.autoFulfilled ? new Date() : null,
        reservedExpiresAt: null,
      },
    });

    if (updateResult.count === 0) {
      const latest = await prisma.transaction.findUnique({
        where: { id: transactionId },
      });

      if (
        latest &&
        isCheckoutIdempotentState(latest.status) &&
        latest.transactionSignature === transactionSignature &&
        latest.burnSignature === burnSignature
      ) {
        return NextResponse.json({
          ...latest,
          fulfillmentMessage: fulfillment.message,
          idempotentReplay: true,
        });
      }

      return respondWithError(
        request,
        409,
        "Transaction was updated by another request. Re-fetch status and retry only if needed.",
        "CHECKOUT_STATE_CONFLICT",
        {
          transactionId,
          latestStatus: latest?.status ?? null,
        },
      );
    }

    const updatedTransaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!updatedTransaction) {
      return respondWithError(
        request,
        500,
        "Transaction disappeared after checkout update.",
        "CHECKOUT_POST_UPDATE_NOT_FOUND",
        { transactionId },
      );
    }

    await prisma.slab.updateMany({
      where: { id: transaction.slabId },
      data: { status: "SOLD" },
    });

    await prisma.user.upsert({
      where: { walletAddress: transaction.buyerWallet },
      update: {
        totalPurchases: { increment: 1 },
        totalSpentUsd: { increment: transaction.totalUsdValue || 0 },
      },
      create: {
        email: `${transaction.buyerWallet}@wallet.slabvaultfi.local`,
        walletAddress: transaction.buyerWallet,
        firstPurchaseAt: new Date(),
        totalPurchases: 1,
        totalSpentUsd: transaction.totalUsdValue || 0,
      },
    });

    return NextResponse.json({
      ...updatedTransaction,
      fulfillmentMessage: fulfillment.message,
    });
  } catch (error) {
    if (isPrismaMissingColumnError(error, "paymentSplit")) {
      return respondWithError(
        request,
        503,
        "Database schema is behind and missing Transaction.paymentSplit.",
        "CHECKOUT_SCHEMA_MISSING_PAYMENT_SPLIT",
        undefined,
        getMigrationRecoveryHint(),
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return respondWithError(
        request,
        409,
        "Payment signature already used by another transaction.",
        "CHECKOUT_SIGNATURE_CONSTRAINT_CONFLICT",
        {
          uniqueTarget: Array.isArray(error.meta?.target)
            ? error.meta.target.join(",")
            : String(error.meta?.target ?? "unknown"),
        },
      );
    }

    console.error("Error processing checkout:", error);
    return respondWithError(
      request,
      500,
      "Failed to process checkout",
      "CHECKOUT_INTERNAL_ERROR",
      {
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    );
  }
}
