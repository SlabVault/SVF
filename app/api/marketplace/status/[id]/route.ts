import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/admin-auth";
import {
  getMigrationRecoveryHint,
  isPrismaMissingColumnError,
} from "@/lib/prisma-compat";
import { jsonError } from "@/lib/api-errors";
import {
  parseWalletAccessParams,
  verifyTransactionStatusWalletAccess,
} from "@/lib/wallet-transaction-access";

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

/**
 * GET /api/marketplace/status/:id - Get transaction status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { searchParams } = new URL(request.url);
    const accessParams = parseWalletAccessParams(searchParams);

    const { id } = await params;
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        slab: true,
      },
    });

    if (!transaction) {
      return jsonError({
        request,
        status: 404,
        code: "STATUS_TRANSACTION_NOT_FOUND",
        message: "Transaction not found",
      });
    }

    const isBuyer =
      accessParams.buyerWallet === transaction.buyerWallet &&
      verifyTransactionStatusWalletAccess(id, accessParams);
    const adminAuthError = await requireAuth(request);
    const isAdmin = adminAuthError === null;

    if (!isBuyer && !isAdmin) {
      return NextResponse.json(
        {
          id: transaction.id,
          status: transaction.status,
          buyerWallet: transaction.buyerWallet,
          solAmount: toNumber(transaction.solAmount),
          svfAmount: toNumber(transaction.svfAmount),
          totalUsdValue:
            transaction.totalUsdValue == null
              ? null
              : toNumber(transaction.totalUsdValue),
          paymentSplit: transaction.paymentSplit,
          reservedExpiresAt: transaction.reservedExpiresAt,
          createdAt: transaction.createdAt,
          completedAt: transaction.completedAt,
          fulfilledAt: transaction.fulfilledAt,
          slab: transaction.slab
            ? {
                id: transaction.slab.id,
                name: transaction.slab.name,
                grade: transaction.slab.grade,
                imageUrl: transaction.slab.imageUrl,
              }
            : null,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      id: transaction.id,
      status: transaction.status,
      buyerWallet: transaction.buyerWallet,
      solAmount: toNumber(transaction.solAmount),
      svfAmount: toNumber(transaction.svfAmount),
      totalUsdValue:
        transaction.totalUsdValue == null
          ? null
          : toNumber(transaction.totalUsdValue),
      slab: transaction.slab
        ? {
            id: transaction.slab.id,
            name: transaction.slab.name,
            grade: transaction.slab.grade,
            imageUrl: transaction.slab.imageUrl,
            estimatedValueUsd:
              transaction.slab.estimatedValueUsd == null
                ? null
                : toNumber(transaction.slab.estimatedValueUsd),
          }
        : null,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt,
      fulfilledAt: transaction.fulfilledAt,
      transactionSignature: transaction.transactionSignature,
      burnSignature: transaction.burnSignature,
      fulfillmentSignature: transaction.fulfillmentSignature,
      reservedExpiresAt: transaction.reservedExpiresAt,
      paymentSplit: transaction.paymentSplit,
    });
  } catch (error) {
    if (isPrismaMissingColumnError(error, "paymentSplit")) {
      return jsonError({
        request,
        status: 503,
        code: "STATUS_SCHEMA_MISSING_PAYMENT_SPLIT",
        message: "Database schema is behind and missing Transaction.paymentSplit.",
        recoveryHint: getMigrationRecoveryHint(),
      });
    }

    console.error("Error fetching transaction status:", error);
    return jsonError({
      request,
      status: 500,
      code: "STATUS_INTERNAL_ERROR",
      message: "Failed to fetch transaction status",
      details: {
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    });
  }
}
