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

    // Check if slab exists and is available
    const slab = await prisma.slab.findUnique({
      where: { id: slabId },
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

    // Reserve the slab
    const updatedSlab = await prisma.slab.update({
      where: { id: slabId },
      data: { status: "RESERVED" },
    });

    // Create a pending transaction
    const transaction = await prisma.transaction.create({
      data: {
        slabId,
        buyerWallet,
        solAmount: slab.solPrice,
        svfAmount: slab.svfPrice,
        totalUsdValue: slab.estimatedValueUsd,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      slab: updatedSlab,
      transaction,
    });
  } catch (error) {
    console.error("Error reserving slab:", error);
    return NextResponse.json(
      { error: "Failed to reserve slab" },
      { status: 500 }
    );
  }
}
