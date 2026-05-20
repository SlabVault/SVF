import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/marketplace/status/:id - Get transaction status
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: transaction.id,
      status: transaction.status,
      slab: transaction.slab,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt,
      transactionSignature: transaction.transactionSignature,
      burnSignature: transaction.burnSignature,
    });
  } catch (error) {
    console.error("Error fetching transaction status:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction status" },
      { status: 500 }
    );
  }
}
