import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/marketplace/checkout - Initiate purchase
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transactionId, transactionSignature, burnSignature } = body;

    // Get the transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { slab: true },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    if (transaction.status !== "PENDING") {
      return NextResponse.json(
        { error: "Transaction is not in pending state" },
        { status: 400 }
      );
    }

    // Update transaction with signatures
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        transactionSignature,
        burnSignature,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // Update slab status to SOLD
    await prisma.slab.update({
      where: { id: transaction.slabId },
      data: { status: "SOLD" },
    });

    // Update user stats
    await prisma.user.upsert({
      where: { walletAddress: transaction.buyerWallet },
      update: {
        totalPurchases: { increment: 1 },
        totalSpentUsd: { increment: transaction.totalUsdValue || 0 },
      },
      create: {
        walletAddress: transaction.buyerWallet,
        firstPurchaseAt: new Date(),
        totalPurchases: 1,
        totalSpentUsd: transaction.totalUsdValue || 0,
      },
    });

    return NextResponse.json(updatedTransaction);
  } catch (error) {
    console.error("Error processing checkout:", error);
    return NextResponse.json(
      { error: "Failed to process checkout" },
      { status: 500 }
    );
  }
}
