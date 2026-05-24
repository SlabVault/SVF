import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import { prisma } from "@/lib/prisma";
import { DB_PROBE_TIMEOUT_MS } from "@/lib/fetch-with-timeout";

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

/** True when Prisma can use DATABASE_URL (direct Postgres or Prisma proxy). */
export function isSupportedDatabaseUrl(url: string): boolean {
  return (
    isDirectPostgresDatabaseUrl(url) || isPrismaProxyDatabaseUrl(url)
  );
}

let cachedPrismaHasQueryEngine: boolean | null = null;
let prismaClientHasBundledQueryEngineOverride: boolean | null = null;

/** Test helper — force bundled query engine detection for protocol ops checks. */
export function setPrismaClientHasBundledQueryEngineForTests(
  value: boolean | null,
): void {
  prismaClientHasBundledQueryEngineOverride = value;
  cachedPrismaHasQueryEngine = null;
}

/** False when `prisma generate --no-engine` — only prisma:// / prisma+postgres:// work. */
export function prismaClientHasBundledQueryEngine(): boolean {
  if (prismaClientHasBundledQueryEngineOverride !== null) {
    return prismaClientHasBundledQueryEngineOverride;
  }
  if (cachedPrismaHasQueryEngine !== null) return cachedPrismaHasQueryEngine;
  try {
    const clientDir = path.join(process.cwd(), "node_modules", ".prisma", "client");
    if (!existsSync(clientDir)) {
      cachedPrismaHasQueryEngine = true;
      return cachedPrismaHasQueryEngine;
    }
    const names = readdirSync(clientDir);
    cachedPrismaHasQueryEngine = names.some(
      (name) => name.startsWith("query_engine-") && name.endsWith(".node"),
    );
  } catch {
    cachedPrismaHasQueryEngine = true;
  }
  return cachedPrismaHasQueryEngine;
}

/** True when $queryRaw would fail on URL protocol before a real DB connection attempt. */
export function isDatabaseUrlProtocolIncompatible(url: string): boolean {
  if (!isSupportedDatabaseUrl(url)) return true;
  if (isDirectPostgresDatabaseUrl(url) && !prismaClientHasBundledQueryEngine()) {
    return true;
  }
  return false;
}

/** Operator-facing remediation when DATABASE_URL protocol skips Prisma writes. */
export function databaseUrlProtocolRemediation(url: string): string {
  if (!isSupportedDatabaseUrl(url)) {
    return "Use postgresql:// for direct Postgres or prisma+postgres:// for Prisma Accelerate / dev.";
  }
  if (isDirectPostgresDatabaseUrl(url) && !prismaClientHasBundledQueryEngine()) {
    return "Use prisma+postgres:// with `npx prisma dev`, or run `prisma generate` (without --no-engine) and keep postgresql://.";
  }
  return "Use postgresql:// for direct Postgres or prisma+postgres:// for Prisma Accelerate.";
}

function isPrismaProtocolValidationError(message: string): boolean {
  return (
    message.includes("must start with the protocol") &&
    (message.includes("prisma://") || message.includes("prisma+postgres://"))
  );
}

function isPrismaFetchFailedError(message: string): boolean {
  return (
    message.includes("fetch failed") ||
    message.includes("Cannot fetch data from service")
  );
}

/** Set after first Accelerate/proxy fetch failure — skips all further Prisma probes. */
let dbProbeFailedPermanent = false;

/** True in development when DATABASE_URL uses prisma+ / prisma:// (optional local DB). */
export function isOptionalPrismaProxyInDevelopment(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  const url = getDatabaseUrl();
  return !!url && isPrismaProxyDatabaseUrl(url);
}

/**
 * True when DATABASE_URL points at Prisma dev / Accelerate proxy but we are not
 * in production — local sync scripts and Next dev should use JSON seed without
 * probing or upserting until `npx prisma dev` or direct postgresql:// is set.
 */
export function isPrismaProxyJsonSeedMode(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const url = getDatabaseUrl();
  return !!url && isPrismaProxyDatabaseUrl(url);
}

/** True when read paths should skip Prisma and use JSON fallbacks immediately. */
export function shouldSkipDatabaseReads(): boolean {
  return dbProbeFailedPermanent;
}

/**
 * True when write paths (sync upsert) should skip Prisma without attempting I/O.
 * Batch jobs may retry even when read probe failed; only skip missing/invalid URL.
 */
export function shouldSkipDatabaseWrites(): boolean {
  const url = getDatabaseUrl();
  if (!url) return true;
  return isDatabaseUrlProtocolIncompatible(url);
}

export function databaseUrlUnreachableHint(url: string): string {
  if (!isSupportedDatabaseUrl(url)) {
    return "DATABASE_URL protocol is not supported (use postgresql:// or prisma+postgres://). Serving listings from JSON seed.";
  }
  if (isDirectPostgresDatabaseUrl(url) && !prismaClientHasBundledQueryEngine()) {
    return "DATABASE_URL uses postgresql:// but Prisma Client was generated without a query engine (`prisma generate --no-engine`). Use prisma+postgres:// with `npx prisma dev`, or run `prisma generate` (without --no-engine) for direct Postgres.";
  }
  if (isPrismaProxyDatabaseUrl(url)) {
    return "DATABASE_URL uses a Prisma proxy (prisma+postgres://). App auto-falls back to JSON seed — run `npx prisma dev` or switch to postgresql:// for a live DB.";
  }
  return "DATABASE_URL is set but the database is unreachable. Check that Postgres is running and the connection string is correct.";
}

export type DatabaseSkipReason =
  | "unconfigured"
  | "prisma_dev_unavailable"
  | "probe_failed"
  | "protocol_incompatible";

export type DatabaseAvailability =
  | { available: true }
  | { available: false; reason: DatabaseSkipReason; hint?: string };

export type DatabaseStatus =
  | { state: "unconfigured" }
  | { state: "connected" }
  | { state: "unreachable"; hint: string; detail?: string; reason?: DatabaseSkipReason };

const DB_STATUS_CACHE_MS = 30_000;

const PRISMA_DEV_UNAVAILABLE_HINT =
  "Prisma dev server not running (prisma+postgres:// in development). Serving from JSON seed — no need to unset DATABASE_URL.";

let connectionCheck: Promise<DatabaseStatus> | null = null;
let cachedStatus: DatabaseStatus | null = null;
let cachedStatusAt = 0;
let databaseStatusProbeOverride: (() => Promise<DatabaseStatus>) | null = null;

/** Test helper — clears cached reachability probe between cases. */
export function resetDatabaseStatusCache(): void {
  cachedStatus = null;
  cachedStatusAt = 0;
  connectionCheck = null;
  dbProbeFailedPermanent = false;
}

/** Test helper — inject a status probe without calling Prisma. */
export function setDatabaseStatusProbeForTests(
  probe: (() => Promise<DatabaseStatus>) | null,
): void {
  databaseStatusProbeOverride = probe;
  resetDatabaseStatusCache();
}

function prismaDevUnavailableStatus(): DatabaseStatus {
  return {
    state: "unreachable",
    hint: PRISMA_DEV_UNAVAILABLE_HINT,
    detail: "prisma_dev_unavailable",
    reason: "prisma_dev_unavailable",
  };
}

function unreachableStatusForUrl(
  url: string,
  detail: string,
  reason?: DatabaseSkipReason,
): DatabaseStatus {
  return {
    state: "unreachable",
    hint: databaseUrlUnreachableHint(url),
    detail,
    reason,
  };
}

export function databaseAvailabilityFromStatus(
  status: DatabaseStatus,
): DatabaseAvailability {
  if (status.state === "connected") return { available: true };
  if (status.state === "unconfigured") {
    return { available: false, reason: "unconfigured" };
  }
  if (status.reason) {
    return { available: false, reason: status.reason, hint: status.hint };
  }
  if (dbProbeFailedPermanent) {
    return { available: false, reason: "probe_failed", hint: status.hint };
  }
  return { available: false, reason: "protocol_incompatible", hint: status.hint };
}

export async function getDatabaseAvailability(): Promise<DatabaseAvailability> {
  return databaseAvailabilityFromStatus(await getDatabaseStatus());
}

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  if (databaseStatusProbeOverride) {
    return databaseStatusProbeOverride();
  }

  const url = getDatabaseUrl();
  if (!url) return { state: "unconfigured" };

  if (dbProbeFailedPermanent && cachedStatus) {
    return cachedStatus;
  }

  const now = Date.now();
  if (cachedStatus && now - cachedStatusAt < DB_STATUS_CACHE_MS) {
    return cachedStatus;
  }

  if (isDatabaseUrlProtocolIncompatible(url)) {
    cachedStatus = unreachableStatusForUrl(
      url,
      "Skipped Prisma connectivity probe (DATABASE_URL protocol incompatible with generated client).",
      "protocol_incompatible",
    );
    cachedStatusAt = now;
    return cachedStatus;
  }

  if (!connectionCheck) {
    connectionCheck = (async (): Promise<DatabaseStatus> => {
      try {
        await Promise.race([
          prisma.$queryRaw`SELECT 1`,
          new Promise<never>((_, reject) => {
            setTimeout(
              () => reject(new Error(`Database probe timed out after ${DB_PROBE_TIMEOUT_MS}ms`)),
              DB_PROBE_TIMEOUT_MS,
            );
          }),
        ]);
        cachedStatus = { state: "connected" };
        cachedStatusAt = Date.now();
        return cachedStatus;
      } catch (error) {
        const detail =
          error instanceof Error ? error.message : String(error);
        const hint = isPrismaProtocolValidationError(detail)
          ? "DATABASE_URL uses postgresql:// but Prisma Client requires prisma+postgres:// or prisma://. Run `npx prisma dev` and use the printed URL, or run `prisma generate` (without --no-engine) for direct Postgres."
          : databaseUrlUnreachableHint(url);
        if (isPrismaFetchFailedError(detail)) {
          dbProbeFailedPermanent = true;
        }
        const reason: DatabaseSkipReason | undefined = isPrismaFetchFailedError(
          detail,
        )
          ? "probe_failed"
          : isPrismaProxyDatabaseUrl(url) &&
              process.env.NODE_ENV !== "production"
            ? "prisma_dev_unavailable"
            : undefined;
        cachedStatus = {
          state: "unreachable",
          hint,
          detail,
          reason,
        };
        cachedStatusAt = Date.now();
        return cachedStatus;
      } finally {
        connectionCheck = null;
      }
    })();
  }

  return connectionCheck;
}
