import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateWalletAddress } from "@/lib/security";

/**
 * POST /api/marketplace/reserve - Reserve slab for purchase
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slabId, buyerWallet } = body;

    if (!slabId || !buyerWallet) {
      return NextResponse.json(
        { error: "slabId and buyerWallet are required" },
        { status: 400 },
      );
    }

    if (!validateWalletAddress(buyerWallet)) {
      return NextResponse.json(
        { error: "Invalid buyer wallet address" },
        { status: 400 },
      );
    }

    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json(
        { error: "Database required for checkout. Set DATABASE_URL and run db:seed." },
        { status: 503 },
      );
    }

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
      return NextResponse.json(
        { error: "Slab not found" },
        { status: 404 }
      );
    }

    if (slab.status !== "AVAILABLE") {
      return NextResponse.json(
        { error: "Slab is not available for purchase" },
        { status: 400 }
      );
    }

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
            solAmount: slab.solPrice,
            svfAmount: slab.svfPrice,
            totalUsdValue: slab.estimatedValueUsd,
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
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SLAB_ALREADY_RESERVED") {
      return NextResponse.json(
        { error: "Slab was just reserved by another buyer. Please refresh listings." },
        { status: 409 }
      );
    }

    console.error("Error reserving slab:", error);
    return NextResponse.json(
      { error: "Failed to reserve slab" },
      { status: 500 }
    );
  }
}
