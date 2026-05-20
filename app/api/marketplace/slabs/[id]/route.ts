import { NextResponse } from "next/server";
import { getMarketplaceSlabById } from "@/lib/marketplace-slabs";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/marketplace/slabs/:id - Get slab details
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const slab = await getMarketplaceSlabById(id);

    if (!slab) {
      return NextResponse.json({ error: "Slab not found" }, { status: 404 });
    }

    return NextResponse.json(slab, {
      headers: slab.fallbackSource
        ? { "X-Marketplace-Source": slab.fallbackSource }
        : undefined,
    });
  } catch (error) {
    console.error("Error fetching slab:", error);
    return NextResponse.json(
      { error: "Failed to fetch slab" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/marketplace/slabs/:id - Update slab (admin only)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const slab = await prisma.slab.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.grade && { grade: body.grade }),
        ...(body.estimatedValueUsd !== undefined && {
          estimatedValueUsd: body.estimatedValueUsd,
        }),
        ...(body.acquiredAt && { acquiredAt: new Date(body.acquiredAt) }),
        ...(body.imageUrl && { imageUrl: body.imageUrl }),
        ...(body.vaultedUrl && { vaultedUrl: body.vaultedUrl }),
        ...(body.collectrUrl !== undefined && {
          collectrUrl: body.collectrUrl,
        }),
        ...(body.status && { status: body.status }),
        ...(body.solPrice && { solPrice: body.solPrice }),
        ...(body.svfPrice && { svfPrice: body.svfPrice }),
      },
    });

    if (body.solPrice || body.svfPrice) {
      await prisma.pricingHistory.create({
        data: {
          slabId: id,
          solPrice: body.solPrice || slab.solPrice,
          svfPrice: body.svfPrice || slab.svfPrice,
        },
      });
    }

    return NextResponse.json(slab);
  } catch (error) {
    console.error("Error updating slab:", error);
    return NextResponse.json(
      { error: "Failed to update slab" },
      { status: 500 },
    );
  }
}
