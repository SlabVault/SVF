import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function isDevOptionalDatabaseUrl(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  const url = process.env.DATABASE_URL?.trim() ?? "";
  if (!url) return true;
  return (
    url.startsWith("prisma+postgres://") ||
    url.startsWith("prisma+postgresql://") ||
    url.startsWith("prisma://")
  );
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development" && !isDevOptionalDatabaseUrl()
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
