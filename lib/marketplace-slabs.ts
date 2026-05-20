import slabsJson from "@/data/slabs.json";
import {
  getDatabaseStatus,
  getDatabaseUrl,
} from "@/lib/db-connection";
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

export type MarketplaceListResult = {
  slabs: MarketplaceSlab[];
  /** True only when listings are served from data/slabs.json (no working DB). */
  fromFallback: boolean;
  dbStatus: "unconfigured" | "connected" | "unreachable";
  dbHint?: string;
};

let lastDbErrorFingerprint: string | null = null;
let lastDbErrorAt = 0;

function logDbErrorOnce(prefix: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const fingerprint = `${prefix}:${message}`;
  const now = Date.now();
  if (
    lastDbErrorFingerprint === fingerprint &&
    now - lastDbErrorAt < 30_000
  ) {
    return;
  }
  lastDbErrorFingerprint = fingerprint;
  lastDbErrorAt = now;
  console.error(prefix, error);
}

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
  if (wantStatus === "SOLD") return [];
  return slabs.map((slab) => {
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

function buildWhere(options?: {
  status?: string;
  grade?: string;
  minPrice?: string;
  maxPrice?: string;
}): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (options?.status) where.status = options.status;
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
  return where;
}

function normalizeMarketplaceId(id: string): string {
  try {
    return decodeURIComponent(id).trim().toLowerCase();
  } catch {
    return id.trim().toLowerCase();
  }
}

export async function listMarketplaceSlabs(options?: {
  status?: string;
  grade?: string;
  minPrice?: string;
  maxPrice?: string;
}): Promise<MarketplaceListResult> {
  if (!getDatabaseUrl()) {
    return {
      slabs: slabsFromJson(options?.status),
      fromFallback: true,
      dbStatus: "unconfigured",
    };
  }

  const dbStatus = await getDatabaseStatus();
  if (dbStatus.state === "unreachable") {
    console.error("Marketplace DB unavailable:", dbStatus.detail);
    return {
      slabs: slabsFromJson(options?.status),
      fromFallback: true,
      dbStatus: "unreachable",
      dbHint: dbStatus.hint,
    };
  }

  try {
    const rows = await prisma.slab.findMany({
      where: buildWhere(options),
      orderBy: { createdAt: "desc" },
    });

    return {
      slabs: rows.map(serializeDbSlab),
      fromFallback: false,
      dbStatus: "connected",
    };
  } catch (error) {
    console.error("Marketplace DB query failed:", error);
    return {
      slabs: slabsFromJson(options?.status),
      fromFallback: true,
      dbStatus: "unreachable",
      dbHint:
        "Database query failed. Verify DATABASE_URL and run `npm run db:push` then `npm run db:seed`.",
    };
  }
}

export async function getMarketplaceSlabById(
  id: string,
): Promise<MarketplaceSlab | null> {
  const normalizedId = normalizeMarketplaceId(id);
  if (!normalizedId) return null;

  if (getDatabaseUrl()) {
    try {
      const slab = await prisma.slab.findUnique({
        where: { id: normalizedId },
        include: {
          pricingHistory: {
            orderBy: { changedAt: "desc" },
            take: 10,
          },
        },
      });
      if (slab) return serializeDbSlab(slab);
    } catch (error) {
      logDbErrorOnce("Error fetching slab from DB:", error);
    }
  }

  const fallback = slabsFromJson().find(
    (s) => normalizeMarketplaceId(s.id) === normalizedId,
  );
  return fallback ?? null;
}
