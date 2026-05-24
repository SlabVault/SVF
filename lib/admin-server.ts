import { Prisma, type TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  isPrismaMissingColumnError,
} from "@/lib/prisma-compat";
import { inspectSchemaHealth } from "@/lib/schema-health";

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
  paymentSplit: "FIXED_DUAL" | "SOL_80_SVF_20";
  createdAt: Date;
  reservedExpiresAt: Date | null;
  completedAt: Date | null;
  fulfilledAt: Date | null;
  solAmount: number;
  svfAmount: number;
  totalUsdValue: number | null;
  slab?: { name: string; grade?: string } | null;
};

export type AdminTransactionsResult = {
  rows: AdminTransactionRow[];
  schemaWarning: string | null;
};

type AdminTransactionsFilters = {
  status?: string;
  query?: string;
  onlyNeedsAction?: boolean;
};

const ALLOWED_TRANSACTION_STATUSES = [
  "PENDING",
  "PENDING_FULFILLMENT",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

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

export async function getAdminTransactions(
  filters: AdminTransactionsFilters = {},
): Promise<AdminTransactionsResult> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { rows: [], schemaWarning: null };
  }

  try {
    const schemaHealth = await inspectSchemaHealth();
    if (schemaHealth.severity === "blocking") {
      return {
        rows: [],
        schemaWarning: `${schemaHealth.summary} ${schemaHealth.recoveryHint} Admin remains available, but transaction data is paused until remediation completes.`,
      };
    }

    const where: Prisma.TransactionWhereInput = {};

    if (
      filters.status &&
      (ALLOWED_TRANSACTION_STATUSES as readonly string[]).includes(filters.status)
    ) {
      where.status = filters.status as TransactionStatus;
    }

    if (filters.onlyNeedsAction) {
      where.status = { in: ["PENDING", "PENDING_FULFILLMENT"] };
    }

    const query = filters.query?.trim();
    if (query) {
      where.OR = [
        { id: { contains: query, mode: "insensitive" } },
        { buyerWallet: { contains: query, mode: "insensitive" } },
        { slab: { is: { name: { contains: query, mode: "insensitive" } } } },
      ];
    }

    const rows = await prisma.transaction.findMany({
      where,
      select: {
        id: true,
        buyerWallet: true,
        status: true,
        paymentSplit: true,
        createdAt: true,
        reservedExpiresAt: true,
        completedAt: true,
        fulfilledAt: true,
        solAmount: true,
        svfAmount: true,
        totalUsdValue: true,
        slab: {
          select: {
            name: true,
            grade: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      rows: rows.map((tx) => ({
        id: tx.id,
        buyerWallet: tx.buyerWallet,
        status: tx.status,
        paymentSplit: tx.paymentSplit,
        createdAt: tx.createdAt,
        reservedExpiresAt: tx.reservedExpiresAt,
        completedAt: tx.completedAt,
        fulfilledAt: tx.fulfilledAt,
        solAmount: toNumber(tx.solAmount),
        svfAmount: toNumber(tx.svfAmount),
        totalUsdValue:
          tx.totalUsdValue == null ? null : toNumber(tx.totalUsdValue),
        slab: tx.slab ? { name: tx.slab.name, grade: tx.slab.grade } : null,
      })),
      schemaWarning:
        schemaHealth.severity === "warning"
          ? `${schemaHealth.summary} ${schemaHealth.recoveryHint}`
          : null,
    };
  } catch (error) {
    if (isPrismaMissingColumnError(error, "paymentSplit")) {
      const schemaHealth = await inspectSchemaHealth();
      return {
        rows: [],
        schemaWarning: `${schemaHealth.summary} ${schemaHealth.recoveryHint}`,
      };
    }

    console.error("Admin transactions unavailable:", error);
    return { rows: [], schemaWarning: null };
  }
}
