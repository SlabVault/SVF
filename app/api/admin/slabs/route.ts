import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/admin-auth";

/**
 * POST /api/admin/slabs - Admin: Create/update slab listing
 */
export async function POST(request: Request) {
  const authError = requireAuth(request);
  if (authError) return authError;

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
    return NextResponse.json(
      { error: "Failed to manage slab" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/slabs - Admin: List all slabs
 */
export async function GET(request: Request) {
  const authError = requireAuth(request);
  if (authError) return authError;

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
    return NextResponse.json(
      { error: "Failed to fetch slabs" },
      { status: 500 }
    );
  }
}
