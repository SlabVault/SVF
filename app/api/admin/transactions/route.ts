import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/admin-auth";

/**
 * GET /api/admin/transactions - Admin: View all transactions
 */
export async function GET(request: Request) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
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
