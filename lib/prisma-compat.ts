import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
export { getMigrationRecoveryHint } from "@/lib/schema-health";

const PAYMENT_SPLIT_COLUMN = "paymentSplit";

export function isPrismaMissingColumnError(
  error: unknown,
  expectedColumn?: string,
): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2022"
  ) {
    return false;
  }

  if (!expectedColumn) return true;

  const columnMeta =
    typeof error.meta === "object" && error.meta !== null
      ? (error.meta as { column?: unknown }).column
      : undefined;

  if (typeof columnMeta !== "string") return false;
  return columnMeta.toLowerCase().includes(expectedColumn.toLowerCase());
}

export async function hasTransactionPaymentSplitColumn(): Promise<boolean | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;

  try {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'Transaction'
          AND column_name = ${PAYMENT_SPLIT_COLUMN}
      ) AS "exists"
    `;

    return Boolean(rows[0]?.exists);
  } catch (error) {
    console.warn("Unable to inspect transaction schema health:", error);
    return null;
  }
}
