import { prisma } from "@/lib/prisma";

export function getDatabaseUrl(): string | null {
  const url = process.env.DATABASE_URL?.trim();
  return url || null;
}

/** True when DATABASE_URL points at Prisma dev / Accelerate proxy, not direct Postgres. */
export function isPrismaProxyDatabaseUrl(url: string): boolean {
  return (
    url.startsWith("prisma+postgres://") ||
    url.startsWith("prisma+postgresql://") ||
    url.startsWith("prisma://")
  );
}

export function isDirectPostgresDatabaseUrl(url: string): boolean {
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

export type DatabaseStatus =
  | { state: "unconfigured" }
  | { state: "connected" }
  | { state: "unreachable"; hint: string; detail?: string };

let connectionCheck: Promise<DatabaseStatus> | null = null;

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const url = getDatabaseUrl();
  if (!url) return { state: "unconfigured" };

  if (!connectionCheck) {
    connectionCheck = (async (): Promise<DatabaseStatus> => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return { state: "connected" };
      } catch (error) {
        const detail =
          error instanceof Error ? error.message : String(error);
        const hint = isPrismaProxyDatabaseUrl(url)
          ? "DATABASE_URL uses a Prisma proxy (prisma+postgres://). For local dev, use a direct postgresql:// URL or run `npx prisma dev` to start the local Prisma Postgres server."
          : "DATABASE_URL is set but the database is unreachable. Check that Postgres is running and the connection string is correct.";
        return { state: "unreachable", hint, detail };
      } finally {
        connectionCheck = null;
      }
    })();
  }

  return connectionCheck;
}
