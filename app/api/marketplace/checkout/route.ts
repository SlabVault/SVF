import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCheckoutPayments } from "@/lib/marketplace-payment-verify";
import { attemptAutoFulfillment } from "@/lib/marketplace-fulfillment";

/**
 * POST /api/marketplace/checkout - Confirm split payment and queue fulfillment
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transactionId, transactionSignature, burnSignature } = body;

    if (!transactionId || !transactionSignature || !burnSignature) {
      return NextResponse.json(
        { error: "transactionId, transactionSignature, and burnSignature are required" },
        { status: 400 },
      );
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { slab: true },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    if (transaction.status !== "PENDING") {
      return NextResponse.json(
        { error: `Transaction is ${transaction.status}, not pending checkout` },
        { status: 400 },
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
      return NextResponse.json(
        { error: verification.error || "Payment verification failed" },
        { status: 400 },
      );
    }

    const fulfillment = await attemptAutoFulfillment({
      transactionId: transaction.id,
      buyerWallet: transaction.buyerWallet,
      slabId: transaction.slabId,
    });

    const nextStatus = fulfillment.autoFulfilled ? "COMPLETED" : "PENDING_FULFILLMENT";

    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        transactionSignature,
        burnSignature,
        fulfillmentSignature: fulfillment.fulfillmentSignature,
        status: nextStatus,
        completedAt: new Date(),
        fulfilledAt: fulfillment.autoFulfilled ? new Date() : null,
      },
    });

    await prisma.slab.update({
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
    console.error("Error processing checkout:", error);
    return NextResponse.json(
      { error: "Failed to process checkout" },
      { status: 500 },
    );
  }
}
