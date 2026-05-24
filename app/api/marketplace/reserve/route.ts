import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateWalletAddress } from "@/lib/security";
import { deriveReservePricing } from "@/lib/marketplace-pricing";
import {
  getReservationExpiry,
  releaseExpiredReservations,
} from "@/lib/marketplace-reservations";
import {
  getMigrationRecoveryHint,
  isPrismaMissingColumnError,
} from "@/lib/prisma-compat";
import { getBlockingSchemaIssue } from "@/lib/schema-health";
import { jsonError } from "@/lib/api-errors";
import { requireCsrfProtection } from "@/lib/csrf";
import { VAULT_ROUTES } from "@/lib/vault-routes";
import {
  isReserveWalletChallengeRequired,
  verifyReserveChallenge,
} from "@/lib/wallet-challenge";

/**
 * POST /api/marketplace/reserve - Reserve slab for purchase
 */
export async function POST(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const body = await request.json();
    const { slabId, buyerWallet, paymentSplit, challengeId, walletSignature } =
      body;

    if (!slabId || !buyerWallet) {
      return jsonError({
        request,
        status: 400,
        code: "RESERVE_REQUIRED_FIELDS_MISSING",
        message: "slabId and buyerWallet are required",
      });
    }

    if (!validateWalletAddress(buyerWallet)) {
      return jsonError({
        request,
        status: 400,
        code: "RESERVE_INVALID_BUYER_WALLET",
        message: "Invalid buyer wallet address",
      });
    }

    if (!process.env.DATABASE_URL?.trim()) {
      return jsonError({
        request,
        status: 503,
        code: "RESERVE_DATABASE_NOT_CONFIGURED",
        message: "Database required for checkout. Set DATABASE_URL and run db:seed.",
      });
    }

    const schemaIssue = await getBlockingSchemaIssue();
    if (schemaIssue) {
      return jsonError({
        request,
        status: 503,
        code: "RESERVE_SCHEMA_BLOCKING",
        message: schemaIssue.error,
        recoveryHint: schemaIssue.recoveryHint,
        details: schemaIssue.details,
      });
    }

    if (isReserveWalletChallengeRequired()) {
      if (
        typeof challengeId !== "string" ||
        !challengeId.trim() ||
        typeof walletSignature !== "string" ||
        !walletSignature.trim()
      ) {
        return jsonError({
          request,
          status: 400,
          code: "RESERVE_WALLET_CHALLENGE_REQUIRED",
          message: "Wallet challenge signature is required to reserve this slab.",
          recoveryHint:
            "Request GET /api/marketplace/reserve/challenge, sign the message with your wallet, and retry.",
        });
      }

      const challengeResult = verifyReserveChallenge(
        challengeId.trim(),
        buyerWallet,
        walletSignature.trim(),
      );

      if (!challengeResult.ok) {
        return jsonError({
          request,
          status: 403,
          code: challengeResult.code,
          message: challengeResult.message,
          recoveryHint:
            "Request a fresh challenge from /api/marketplace/reserve/challenge and sign it with the connected wallet.",
        });
      }
    }

    await releaseExpiredReservations();
    const now = new Date();

    const slab = await prisma.slab.findUnique({
      where: { id: slabId },
      select: {
        id: true,
        status: true,
        solPrice: true,
        svfPrice: true,
        estimatedValueUsd: true,
      },
    });

    if (!slab) {
      return jsonError({
        request,
        status: 404,
        code: "RESERVE_SLAB_NOT_FOUND",
        message: "Slab not found",
      });
    }

    const resumableTransaction = await prisma.transaction.findFirst({
      where: {
        slabId,
        buyerWallet,
        status: "PENDING",
        OR: [{ reservedExpiresAt: null }, { reservedExpiresAt: { gt: now } }],
      },
      orderBy: { createdAt: "desc" },
    });

    if (resumableTransaction) {
      const slabForResume =
        slab.status === "AVAILABLE"
          ? await prisma.slab.update({
              where: { id: slab.id },
              data: { status: "RESERVED" },
            })
          : slab;

      return NextResponse.json({
        slab: slabForResume,
        transaction: resumableTransaction,
        resumed: true,
        checkoutUrl: VAULT_ROUTES.shopCheckout(resumableTransaction.id),
      });
    }

    if (slab.status !== "AVAILABLE") {
      const activeReservation = await prisma.transaction.findFirst({
        where: {
          slabId,
          status: "PENDING",
          OR: [{ reservedExpiresAt: null }, { reservedExpiresAt: { gt: now } }],
        },
        select: {
          id: true,
          buyerWallet: true,
          reservedExpiresAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return jsonError({
        request,
        status: 409,
        code: "RESERVE_SLAB_NOT_AVAILABLE",
        message: "Slab is currently reserved or sold. Refresh listings and try another slab.",
        details: activeReservation
          ? {
              activeTransactionId: activeReservation.id,
              reservedExpiresAt:
                activeReservation.reservedExpiresAt?.toISOString() ?? null,
              activeBuyerWalletSuffix: activeReservation.buyerWallet.slice(-4),
            }
          : { slabStatus: slab.status },
        recoveryHint:
          "If this was your reservation, reopen your checkout link. Otherwise wait for expiry or choose another listing.",
      });
    }

    const pricing = deriveReservePricing({
      slabSolPrice: Number(slab.solPrice),
      slabSvfPrice: Number(slab.svfPrice),
      estimatedValueUsd:
        slab.estimatedValueUsd == null ? null : Number(slab.estimatedValueUsd),
      split: paymentSplit,
    });

    const { updatedSlab, transaction } = await prisma.$transaction(async (tx) => {
      const reserveResult = await tx.slab.updateMany({
        where: {
          id: slabId,
          status: "AVAILABLE",
        },
        data: { status: "RESERVED" },
      });

      if (reserveResult.count === 0) {
        throw new Error("SLAB_ALREADY_RESERVED");
      }

      const [reservedSlab, pendingTransaction] = await Promise.all([
        tx.slab.findUnique({
          where: { id: slabId },
        }),
        tx.transaction.create({
          data: {
            slabId,
            buyerWallet,
            paymentSplit: pricing.split,
            solAmount: pricing.solAmount,
            svfAmount: pricing.svfAmount,
            totalUsdValue: slab.estimatedValueUsd,
            listPriceUsdSnapshot: pricing.listPriceUsdSnapshot,
            reservedExpiresAt: getReservationExpiry(),
            status: "PENDING",
          },
        }),
      ]);

      if (!reservedSlab) {
        throw new Error("SLAB_NOT_FOUND_AFTER_RESERVE");
      }

      return {
        updatedSlab: reservedSlab,
        transaction: pendingTransaction,
      };
    });

    return NextResponse.json({
      slab: updatedSlab,
      transaction,
      resumed: false,
      checkoutUrl: VAULT_ROUTES.shopCheckout(transaction.id),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SLAB_ALREADY_RESERVED") {
      return jsonError({
        request,
        status: 409,
        code: "RESERVE_SLAB_ALREADY_RESERVED",
        message: "Slab was just reserved by another buyer. Please refresh listings.",
      });
    }
    if (isPrismaMissingColumnError(error, "paymentSplit")) {
      return jsonError({
        request,
        status: 503,
        code: "RESERVE_SCHEMA_MISSING_PAYMENT_SPLIT",
        message: "Database schema is behind and missing Transaction.paymentSplit.",
        recoveryHint: getMigrationRecoveryHint(),
      });
    }

    console.error("Error reserving slab:", error);
    return jsonError({
      request,
      status: 500,
      code: "RESERVE_INTERNAL_ERROR",
      message: "Failed to reserve slab",
      details: {
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    });
  }
}
