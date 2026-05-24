import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole, requireWriteAuth } from "@/lib/admin-auth";
import { jsonError } from "@/lib/api-errors";

/**
 * POST /api/admin/pricing - Admin: Update pricing
 */
export async function POST(request: NextRequest) {
  const authError = await requireWriteAuth(request);
  if (authError) return authError;

  const roleError = await requireAdminRole(request, ["admin"]);
  if (roleError) return roleError;

  try {
    const body = await request.json();
    const { slabId, solPrice, svfPrice } = body;
    if (typeof slabId !== "string" || !slabId.trim()) {
      return jsonError({
        request,
        status: 400,
        code: "ADMIN_PRICING_INVALID_SLAB_ID",
        message: "slabId is required",
      });
    }

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
    return jsonError({
      request,
      status: 500,
      code: "ADMIN_PRICING_INTERNAL_ERROR",
      message: "Failed to update pricing",
      details: {
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    });
  }
}
