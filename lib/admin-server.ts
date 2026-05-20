import { prisma } from "@/lib/prisma";

export type AdminSlabRow = {
  id: string;
  name: string;
  grade: string;
  status: string;
  solPrice: number;
  svfPrice: number;
  estimatedValueUsd: number | null;
  acquiredAt: Date;
};

export type AdminTransactionRow = {
  id: string;
  buyerWallet: string;
  status: string;
  createdAt: Date;
  solAmount: number;
  svfAmount: number;
  totalUsdValue: number | null;
  slab?: { name: string; grade?: string } | null;
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

export function isAdminApiConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD?.trim());
}

export async function getAdminSlabs(): Promise<AdminSlabRow[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];

  try {
    const rows = await prisma.slab.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        pricingHistory: {
          orderBy: { changedAt: "desc" },
          take: 5,
        },
      },
    });

    return rows.map((slab) => ({
      id: slab.id,
      name: slab.name,
      grade: slab.grade,
      status: slab.status,
      solPrice: toNumber(slab.solPrice),
      svfPrice: toNumber(slab.svfPrice),
      estimatedValueUsd:
        slab.estimatedValueUsd == null ? null : toNumber(slab.estimatedValueUsd),
      acquiredAt: slab.acquiredAt,
    }));
  } catch (error) {
    console.error("Admin slabs unavailable:", error);
    return [];
  }
}

export async function getAdminTransactions(): Promise<AdminTransactionRow[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];

  try {
    const rows = await prisma.transaction.findMany({
      include: { slab: true },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((tx) => ({
      id: tx.id,
      buyerWallet: tx.buyerWallet,
      status: tx.status,
      createdAt: tx.createdAt,
      solAmount: toNumber(tx.solAmount),
      svfAmount: toNumber(tx.svfAmount),
      totalUsdValue: tx.totalUsdValue == null ? null : toNumber(tx.totalUsdValue),
      slab: tx.slab
        ? { name: tx.slab.name, grade: tx.slab.grade }
        : null,
    }));
  } catch (error) {
    console.error("Admin transactions unavailable:", error);
    return [];
  }
}
