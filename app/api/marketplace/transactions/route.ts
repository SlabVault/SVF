import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/marketplace/transactions - Get user transactions
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const buyerWallet = searchParams.get("buyerWallet");
    const status = searchParams.get("status");

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

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
