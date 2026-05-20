import slabsJson from "@/data/slabs.json";
import { prisma } from "@/lib/prisma";
import type { SlabItem } from "@/types/content";

export type MarketplaceSlab = {
  id: string;
  name: string;
  grade: string;
  estimatedValueUsd: number | null;
  acquiredAt: string | Date;
  imageUrl: string;
  vaultedUrl: string;
  collectrUrl: string | null;
  status: string;
  solPrice: number;
  svfPrice: number;
  pricingHistory?: {
    id: string;
    changedAt: string | Date;
    solPrice: number;
    svfPrice: number;
  }[];
  /** Present when listings come from data/slabs.json instead of the database. */
  fallbackSource?: "data/slabs.json";
};

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

function defaultPrices(estimatedValueUsd: number | null) {
  const fmv = estimatedValueUsd ?? 50;
  return {
    solPrice: Math.max(0.1, Math.round((fmv / 150) * 100) / 100),
    svfPrice: Math.max(1000, Math.round(fmv * 100)),
  };
}

function serializeDbSlab(slab: {
  id: string;
  name: string;
  grade: string;
  estimatedValueUsd: unknown;
  acquiredAt: Date;
  imageUrl: string;
  vaultedUrl: string;
  collectrUrl: string | null;
  status: string;
  solPrice: unknown;
  svfPrice: unknown;
  pricingHistory?: {
    id: string;
    changedAt: Date;
    solPrice: unknown;
    svfPrice: unknown;
  }[];
}): MarketplaceSlab {
  return {
    id: slab.id,
    name: slab.name,
    grade: slab.grade,
    estimatedValueUsd:
      slab.estimatedValueUsd == null ? null : toNumber(slab.estimatedValueUsd),
    acquiredAt: slab.acquiredAt,
    imageUrl: slab.imageUrl,
    vaultedUrl: slab.vaultedUrl,
    collectrUrl: slab.collectrUrl,
    status: slab.status,
    solPrice: toNumber(slab.solPrice),
    svfPrice: toNumber(slab.svfPrice),
    pricingHistory: slab.pricingHistory?.map((h) => ({
      id: h.id,
      changedAt: h.changedAt,
      solPrice: toNumber(h.solPrice),
      svfPrice: toNumber(h.svfPrice),
    })),
  };
}

function slabsFromJson(status?: string): MarketplaceSlab[] {
  const slabs = slabsJson as SlabItem[];
  const wantStatus = status?.trim() || "AVAILABLE";
  return slabs
    .filter(() => wantStatus === "AVAILABLE")
    .map((slab) => {
      const { solPrice, svfPrice } = defaultPrices(slab.estimatedValueUsd);
      return {
        id: slab.id,
        name: slab.name,
        grade: slab.grade,
        estimatedValueUsd: slab.estimatedValueUsd,
        acquiredAt: slab.acquiredAt,
        imageUrl: slab.imageUrl,
        vaultedUrl: slab.vaultedUrl,
        collectrUrl: slab.collectrUrl?.trim() ? slab.collectrUrl : null,
        status: "AVAILABLE",
        solPrice,
        svfPrice,
        fallbackSource: "data/slabs.json" as const,
      };
    });
}

export async function listMarketplaceSlabs(options?: {
  status?: string;
  grade?: string;
  minPrice?: string;
  maxPrice?: string;
}): Promise<{ slabs: MarketplaceSlab[]; fromFallback: boolean }> {
  const status = options?.status;

  if (!process.env.DATABASE_URL?.trim()) {
    return { slabs: slabsFromJson(status), fromFallback: true };
  }

  try {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (options?.grade) where.grade = options.grade;
    if (options?.minPrice || options?.maxPrice) {
      where.solPrice = {};
      if (options.minPrice) {
        (where.solPrice as Record<string, unknown>).gte = parseFloat(
          options.minPrice,
        );
      }
      if (options.maxPrice) {
        (where.solPrice as Record<string, unknown>).lte = parseFloat(
          options.maxPrice,
        );
      }
    }

    const rows = await prisma.slab.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const jsonSlabs = slabsFromJson(status);

    if (rows.length > 0) {
      const dbSlabs = rows.map(serializeDbSlab);
      const dbIds = new Set(dbSlabs.map((s) => s.id));
      const extraFromJson = jsonSlabs.filter((s) => !dbIds.has(s.id));
      return {
        slabs: [...dbSlabs, ...extraFromJson],
        fromFallback: extraFromJson.length > 0,
      };
    }

    return { slabs: jsonSlabs, fromFallback: jsonSlabs.length > 0 };
  } catch (error) {
    console.error("Marketplace DB unavailable, using slabs.json:", error);
    return { slabs: slabsFromJson(status), fromFallback: true };
  }
}

export async function getMarketplaceSlabById(
  id: string,
): Promise<MarketplaceSlab | null> {
  if (process.env.DATABASE_URL?.trim()) {
    try {
      const slab = await prisma.slab.findUnique({
        where: { id },
        include: {
          pricingHistory: {
            orderBy: { changedAt: "desc" },
            take: 10,
          },
        },
      });
      if (slab) return serializeDbSlab(slab);
    } catch (error) {
      console.error("Error fetching slab from DB:", error);
    }
  }

  const fallback = slabsFromJson().find((s) => s.id === id);
  return fallback ?? null;
}
