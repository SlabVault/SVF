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
  verifyTransactionsListWalletAccess,
} from "@/lib/wallet-transaction-access";

/**
 * GET /api/marketplace/transactions - Get user transactions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buyerWallet = searchParams.get("buyerWallet");
    const status = searchParams.get("status");
    const accessParams = parseWalletAccessParams(searchParams);
    const adminAuthError = await requireAuth(request);
    const isAdmin = adminAuthError === null;
    const isVerifiedBuyer =
      Boolean(buyerWallet) && verifyTransactionsListWalletAccess(accessParams);

    if (!buyerWallet && !isAdmin) {
      return jsonError({
        request,
        status: 401,
        code: "MARKETPLACE_TRANSACTIONS_BUYER_WALLET_REQUIRED",
        message: "buyerWallet is required unless authenticated as admin",
      });
    }

    const where: Record<string, unknown> = {};

    if (buyerWallet) {
      where.buyerWallet = buyerWallet;
    }

    if (status) {
      where.status = status;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        slab: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      transactions.map((tx) => ({
        ...tx,
        buyerWallet: isAdmin || isVerifiedBuyer ? tx.buyerWallet : "redacted",
        transactionSignature:
          isAdmin || isVerifiedBuyer ? tx.transactionSignature : null,
        burnSignature: isAdmin || isVerifiedBuyer ? tx.burnSignature : null,
        fulfillmentSignature:
          isAdmin || isVerifiedBuyer ? tx.fulfillmentSignature : null,
      })),
    );
  } catch (error) {
    if (isPrismaMissingColumnError(error, "paymentSplit")) {
      return jsonError({
        request,
        status: 503,
        code: "MARKETPLACE_TRANSACTIONS_SCHEMA_MISSING_PAYMENT_SPLIT",
        message: "Database schema is behind and missing Transaction.paymentSplit.",
        recoveryHint: getMigrationRecoveryHint(),
      });
    }

    console.error("Error fetching transactions:", error);
    return jsonError({
      request,
      status: 500,
      code: "MARKETPLACE_TRANSACTIONS_INTERNAL_ERROR",
      message: "Failed to fetch transactions",
      details: {
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    });
  }
}
