import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        slab: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
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
    });
  } catch (error) {
    console.error("Error fetching transaction status:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction status" },
      { status: 500 },
    );
  }
}
