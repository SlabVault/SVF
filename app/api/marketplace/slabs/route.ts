import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { listMarketplaceSlabs } from "@/lib/marketplace-slabs";
import { prisma } from "@/lib/prisma";
import { requireWriteAuth } from "@/lib/admin-auth";

/**
 * GET /api/marketplace/slabs - List purchasable slabs
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { slabs, fromFallback, dbStatus } = await listMarketplaceSlabs({
      status: searchParams.get("status") ?? undefined,
      grade: searchParams.get("grade") ?? undefined,
      minPrice: searchParams.get("minPrice") ?? undefined,
      maxPrice: searchParams.get("maxPrice") ?? undefined,
    });

    return NextResponse.json(slabs, {
      headers: fromFallback
        ? {
            "X-Marketplace-Source": "data/slabs.json",
            "X-Marketplace-Db-Status": dbStatus,
          }
        : { "X-Marketplace-Db-Status": dbStatus },
    });
  } catch (error) {
    console.error("Error fetching slabs:", error);
    return NextResponse.json(
      { error: "Failed to fetch slabs" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/marketplace/slabs - Create new slab listing (admin only)
 */
export async function POST(request: NextRequest) {
  const authError = await requireWriteAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    const slab = await prisma.slab.create({
      data: {
        name: body.name,
        grade: body.grade,
        estimatedValueUsd: body.estimatedValueUsd,
        acquiredAt: new Date(body.acquiredAt),
        imageUrl: body.imageUrl,
        vaultedUrl: body.vaultedUrl,
        collectrUrl: body.collectrUrl || null,
        status: body.status || "AVAILABLE",
        solPrice: body.solPrice,
        svfPrice: body.svfPrice,
      },
    });

    return NextResponse.json(slab, { status: 201 });
  } catch (error) {
    console.error("Error creating slab:", error);
    return NextResponse.json(
      { error: "Failed to create slab" },
      { status: 500 },
    );
  }
}
