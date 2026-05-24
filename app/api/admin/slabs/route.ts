import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole, requireAuth, requireWriteAuth } from "@/lib/admin-auth";
import { jsonError } from "@/lib/api-errors";

/**
 * POST /api/admin/slabs - Admin: Create/update slab listing
 */
export async function POST(request: NextRequest) {
  const authError = await requireWriteAuth(request);
  if (authError) return authError;

  const roleError = await requireAdminRole(request, ["admin"]);
  if (roleError) return roleError;

  try {
    const body = await request.json();
    const { id, ...data } = body;

    let slab;

    if (id) {
      // Update existing slab
      slab = await prisma.slab.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.grade && { grade: data.grade }),
          ...(data.estimatedValueUsd !== undefined && { estimatedValueUsd: data.estimatedValueUsd }),
          ...(data.acquiredAt && { acquiredAt: new Date(data.acquiredAt) }),
          ...(data.imageUrl && { imageUrl: data.imageUrl }),
          ...(data.vaultedUrl && { vaultedUrl: data.vaultedUrl }),
          ...(data.collectrUrl !== undefined && { collectrUrl: data.collectrUrl }),
          ...(data.status && { status: data.status }),
          ...(data.solPrice && { solPrice: data.solPrice }),
          ...(data.svfPrice && { svfPrice: data.svfPrice }),
        },
      });

      // If price changed, add to pricing history
      if (data.solPrice || data.svfPrice) {
        await prisma.pricingHistory.create({
          data: {
            slabId: id,
            solPrice: data.solPrice || slab.solPrice,
            svfPrice: data.svfPrice || slab.svfPrice,
          },
        });
      }
    } else {
      // Create new slab
      slab = await prisma.slab.create({
        data: {
          name: data.name,
          grade: data.grade,
          estimatedValueUsd: data.estimatedValueUsd,
          acquiredAt: new Date(data.acquiredAt),
          imageUrl: data.imageUrl,
          vaultedUrl: data.vaultedUrl,
          collectrUrl: data.collectrUrl || null,
          status: data.status || "AVAILABLE",
          solPrice: data.solPrice,
          svfPrice: data.svfPrice,
        },
      });
    }

    return NextResponse.json(slab);
  } catch (error) {
    console.error("Error managing slab:", error);
    return jsonError({
      request,
      status: 500,
      code: "ADMIN_SLABS_MUTATION_INTERNAL_ERROR",
      message: "Failed to manage slab",
      details: {
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    });
  }
}

/**
 * GET /api/admin/slabs - Admin: List all slabs
 */
export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const roleError = await requireAdminRole(request, ["admin"]);
  if (roleError) return roleError;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    const slabs = await prisma.slab.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        pricingHistory: {
          orderBy: { changedAt: "desc" },
          take: 5,
        },
      },
    });

    return NextResponse.json(slabs);
  } catch (error) {
    console.error("Error fetching slabs:", error);
    return jsonError({
      request,
      status: 500,
      code: "ADMIN_SLABS_LIST_INTERNAL_ERROR",
      message: "Failed to fetch slabs",
      details: {
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    });
  }
}
