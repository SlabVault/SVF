import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import {
  inspectSchemaHealth,
  resetSchemaHealthCache,
} from "../../lib/schema-health";

type QueryResult = unknown;

export function createPrismaKnownRequestError(
  code: string,
  column?: string,
): Prisma.PrismaClientKnownRequestError {
  const error = Object.create(
    Prisma.PrismaClientKnownRequestError.prototype,
  ) as Prisma.PrismaClientKnownRequestError & {
    code: string;
    meta?: { column?: string };
    message: string;
    clientVersion: string;
    name: string;
  };

  error.name = "PrismaClientKnownRequestError";
  error.code = code;
  error.clientVersion = "test";
  error.message = `Prisma error ${code}`;
  if (column) {
    error.meta = { column };
  }

  return error;
}

/** Blocking PaymentSplit column drift with migration history (payment_split_drift). */
export function schemaHealthBlockingQueryResults(): QueryResult[] {
  return [
    [{ ok: 1 }],
    [
      { column_name: "listPriceUsdSnapshot" },
      { column_name: "reservedExpiresAt" },
      { column_name: "solPaidAt" },
      { column_name: "fulfillmentSignature" },
      { column_name: "fulfilledAt" },
    ],
    [{ enumlabel: "FIXED_DUAL" }, { enumlabel: "SOL_80_SVF_20" }],
    [{ enumlabel: "PENDING_FULFILLMENT" }],
    [{ migration_table: "_prisma_migrations" }],
    [],
  ];
}

/** Blocking drift without _prisma_migrations (payment_split_drift_untracked). */
export function schemaHealthBlockingUntrackedQueryResults(): QueryResult[] {
  return [
    [{ ok: 1 }],
    [
      { column_name: "listPriceUsdSnapshot" },
      { column_name: "reservedExpiresAt" },
      { column_name: "solPaidAt" },
      { column_name: "fulfillmentSignature" },
      { column_name: "fulfilledAt" },
    ],
    [{ enumlabel: "FIXED_DUAL" }, { enumlabel: "SOL_80_SVF_20" }],
    [{ enumlabel: "PENDING_FULFILLMENT" }],
    [{ migration_table: null }],
  ];
}

/** Healthy schema for routes that call getBlockingSchemaIssue (severity ok). */
export function schemaHealthOkQueryResults(): QueryResult[] {
  return [
    [{ ok: 1 }],
    [
      { column_name: "paymentSplit" },
      { column_name: "listPriceUsdSnapshot" },
      { column_name: "reservedExpiresAt" },
      { column_name: "solPaidAt" },
      { column_name: "fulfillmentSignature" },
      { column_name: "fulfilledAt" },
    ],
    [{ enumlabel: "FIXED_DUAL" }, { enumlabel: "SOL_80_SVF_20" }],
    [{ enumlabel: "PENDING_FULFILLMENT" }],
    [{ migration_table: "_prisma_migrations" }],
    [
      { migration_name: "20260520140000_marketplace_checkout" },
      { migration_name: "20260520211000_checkout_safety_split" },
      { migration_name: "20260520223500_transaction_schema_backfill" },
    ],
  ];
}

/** Alias: full schema present; migration history may be missing (warning only). */
export function schemaHealthNonBlockingQueryResults(): QueryResult[] {
  return schemaHealthOkQueryResults();
}

export async function withHealthySchemaForTests<T>(run: () => Promise<T> | T): Promise<T> {
  resetSchemaHealthCache();
  return withMockedQueryRaw(schemaHealthOkQueryResults(), async () => {
    await inspectSchemaHealth({ forceRefresh: true });
    return run();
  });
}

export async function withMockedQueryRaw<T>(
  results: QueryResult[],
  run: () => Promise<T>,
): Promise<T> {
  const prismaWithRaw = prisma as unknown as {
    $queryRaw: (...args: unknown[]) => Promise<unknown>;
  };
  const originalQueryRaw = prismaWithRaw.$queryRaw;

  let index = 0;
  prismaWithRaw.$queryRaw = async () => {
    if (index >= results.length) {
      throw new Error(`Unexpected prisma.$queryRaw call #${index + 1}`);
    }
    const value = results[index];
    index += 1;
    return value;
  };

  resetSchemaHealthCache();

  try {
    return await run();
  } finally {
    prismaWithRaw.$queryRaw = originalQueryRaw;
  }
}
