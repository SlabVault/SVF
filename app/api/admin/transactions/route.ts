import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole, requireAuth } from "@/lib/admin-auth";
import {
  getMigrationRecoveryHint,
  isPrismaMissingColumnError,
} from "@/lib/prisma-compat";
import { inspectSchemaHealth } from "@/lib/schema-health";
import { jsonError } from "@/lib/api-errors";

/**
 * GET /api/admin/transactions - Admin: View all transactions
 */
export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const roleError = await requireAdminRole(request, ["admin"]);
  if (roleError) return roleError;

  try {
    const schemaHealth = await inspectSchemaHealth();
    if (schemaHealth.severity === "blocking") {
      return jsonError({
        request,
        status: 503,
        code: "ADMIN_TRANSACTIONS_SCHEMA_BLOCKING",
        message: schemaHealth.summary,
        recoveryHint: schemaHealth.recoveryHint,
        details: schemaHealth.remediationSteps,
      });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const buyerWallet = searchParams.get("buyerWallet");

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (buyerWallet) {
      where.buyerWallet = buyerWallet;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        id: true,
        slabId: true,
        buyerWallet: true,
        solAmount: true,
        svfAmount: true,
        totalUsdValue: true,
        status: true,
        transactionSignature: true,
        burnSignature: true,
        fulfillmentSignature: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
        fulfilledAt: true,
        slab: {
          select: {
            id: true,
            name: true,
            grade: true,
            status: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    if (isPrismaMissingColumnError(error, "paymentSplit")) {
      return jsonError({
        request,
        status: 503,
        code: "ADMIN_TRANSACTIONS_SCHEMA_MISSING_PAYMENT_SPLIT",
        message: "Database schema is behind and missing Transaction.paymentSplit.",
        recoveryHint: getMigrationRecoveryHint(),
      });
    }

    console.error("Error fetching transactions:", error);
    return jsonError({
      request,
      status: 500,
      code: "ADMIN_TRANSACTIONS_INTERNAL_ERROR",
      message: "Failed to fetch transactions",
      details: {
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    });
  }
}
