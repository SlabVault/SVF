import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/admin-auth";

/**
 * POST /api/admin/pricing - Admin: Update pricing
 */
export async function POST(request: Request) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { slabId, solPrice, svfPrice } = body;

    // Update slab pricing
    const slab = await prisma.slab.update({
      where: { id: slabId },
      data: {
        solPrice,
        svfPrice,
      },
    });

    // Add to pricing history
    await prisma.pricingHistory.create({
      data: {
        slabId,
        solPrice,
        svfPrice,
      },
    });

    return NextResponse.json(slab);
  } catch (error) {
    console.error("Error updating pricing:", error);
    return NextResponse.json(
      { error: "Failed to update pricing" },
      { status: 500 }
    );
  }
}
