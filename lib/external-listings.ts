import externalListingsJson from "@/data/external-listings.json";
import {
  databaseUrlProtocolRemediation,
  getDatabaseStatus,
  getDatabaseUrl,
  isSupportedDatabaseUrl,
  shouldSkipDatabaseReads,
  shouldSkipDatabaseWrites,
} from "@/lib/db-connection";
import { prisma } from "@/lib/prisma";
import type {
  ExternalListingCurrency,
  ExternalListingGrader,
  ExternalListingItem,
  ExternalListingSource,
  ExternalListingStatus,
} from "@/types/external-listing";

import type { DiscoverPlatformFilter } from "./external-listings-sources";

export type ExternalListingListResult = {
  listings: ExternalListingItem[];
  fromFallback: boolean;
  dbStatus: "unconfigured" | "connected" | "unreachable";
  dbHint?: string;
};

const STALE_HOURS = 24;

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

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    const parsed = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(parsed) ? parsed : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function serializeDbListing(row: {
  id: string;
  source: string;
  externalId: string;
  deepLinkUrl: string;
  title: string;
  grade: string;
  grader: string | null;
  certNumber: string | null;
  priceUsd: unknown;
  priceSol: unknown;
  currency: string;
  imageUrl: string;
  setName: string | null;
  cardName: string | null;
  fmvUsd: unknown;
  status: string;
  indexedAt: Date;
  staleAfter: Date;
}): ExternalListingItem {
  return {
    id: row.id,
    source: row.source as ExternalListingSource,
    externalId: row.externalId,
    deepLinkUrl: row.deepLinkUrl,
    title: row.title,
    grade: row.grade,
    grader: (row.grader as ExternalListingGrader | null) ?? null,
    certNumber: row.certNumber,
    priceUsd: toNumber(row.priceUsd),
    priceSol: toNumber(row.priceSol),
    currency: row.currency as ExternalListingCurrency,
    imageUrl: row.imageUrl,
    setName: row.setName,
    cardName: row.cardName,
    fmvUsd: toNumber(row.fmvUsd),
    status: row.status as ExternalListingStatus,
    indexedAt: row.indexedAt.toISOString(),
    staleAfter: row.staleAfter.toISOString(),
  };
}

function listingsFromJson(
  platform?: DiscoverPlatformFilter,
): ExternalListingItem[] {
  const rows = externalListingsJson as ExternalListingItem[];
  const active = rows.filter((row) => row.status === "active");
  if (!platform || platform === "all") return active;
  return active.filter((row) => row.source === platform);
}

export type ExternalListingSeedStats = {
  activeCount: number;
  staleCount: number;
  newestIndexedAt: string | null;
};

/** JSON seed health for operator diagnostics (no DB required). */
export function getExternalListingSeedStats(
  now = Date.now(),
): ExternalListingSeedStats {
  const active = listingsFromJson("all");
  let newestIndexedAt: string | null = null;
  let newestMs = Number.NEGATIVE_INFINITY;

  for (const listing of active) {
    const indexedMs = Date.parse(listing.indexedAt);
    if (Number.isFinite(indexedMs) && indexedMs > newestMs) {
      newestMs = indexedMs;
      newestIndexedAt = listing.indexedAt;
    }
  }

  return {
    activeCount: active.length,
    staleCount: active.filter((listing) => isExternalListingStale(listing, now))
      .length,
    newestIndexedAt,
  };
}

function buildWhere(platform?: DiscoverPlatformFilter): Record<string, unknown> {
  const where: Record<string, unknown> = { status: "active" };
  if (platform && platform !== "all") {
    where.source = platform;
  }
  return where;
}

const UNSUPPORTED_DATABASE_URL_HINT =
  "DATABASE_URL protocol is not supported (use postgresql:// or prisma+postgres://). Serving external listings from JSON seed.";

function externalListingsJsonFallback(
  platform: DiscoverPlatformFilter,
  dbStatus: "unconfigured" | "unreachable",
  dbHint?: string,
): ExternalListingListResult {
  return {
    listings: listingsFromJson(platform),
    fromFallback: true,
    dbStatus,
    dbHint,
  };
}

export function isExternalListingStale(
  listing: ExternalListingItem,
  now = Date.now(),
): boolean {
  const staleAfter = Date.parse(listing.staleAfter);
  if (Number.isFinite(staleAfter)) return now > staleAfter;
  const indexedAt = Date.parse(listing.indexedAt);
  if (!Number.isFinite(indexedAt)) return true;
  return now - indexedAt > STALE_HOURS * 60 * 60 * 1000;
}

export function formatIndexedAge(indexedAt: string, now = Date.now()): string {
  const indexed = Date.parse(indexedAt);
  if (!Number.isFinite(indexed)) return "Unknown";
  const minutes = Math.max(0, Math.floor((now - indexed) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export async function listExternalListings(options?: {
  platform?: DiscoverPlatformFilter;
}): Promise<ExternalListingListResult> {
  const platform = options?.platform ?? "all";
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    return externalListingsJsonFallback(platform, "unconfigured");
  }

  if (shouldSkipDatabaseReads()) {
    const dbStatus = await getDatabaseStatus();
    return externalListingsJsonFallback(
      platform,
      "unreachable",
      dbStatus.state === "unreachable" ? dbStatus.hint : undefined,
    );
  }

  if (!isSupportedDatabaseUrl(databaseUrl)) {
    logDbErrorOnce(
      "External listings skipped DB (unsupported DATABASE_URL protocol):",
      databaseUrl,
    );
    return externalListingsJsonFallback(
      platform,
      "unreachable",
      UNSUPPORTED_DATABASE_URL_HINT,
    );
  }

  let dbStatus;
  try {
    dbStatus = await getDatabaseStatus();
  } catch (error) {
    logDbErrorOnce("External listings DB status probe failed:", error);
    return externalListingsJsonFallback(
      platform,
      "unreachable",
      "Database status check failed. Verify DATABASE_URL and Postgres connectivity.",
    );
  }

  if (dbStatus.state === "unreachable") {
    return externalListingsJsonFallback(
      platform,
      "unreachable",
      dbStatus.hint,
    );
  }

  if (dbStatus.state === "unconfigured") {
    return externalListingsJsonFallback(platform, "unconfigured");
  }

  try {
    const rows = await prisma.externalListing.findMany({
      where: buildWhere(platform),
      orderBy: [{ indexedAt: "desc" }, { title: "asc" }],
    });

    if (rows.length === 0) {
      return {
        listings: listingsFromJson(platform),
        fromFallback: true,
        dbStatus: "connected",
      };
    }

    return {
      listings: rows.map(serializeDbListing),
      fromFallback: false,
      dbStatus: "connected",
    };
  } catch (error) {
    logDbErrorOnce("External listings DB query failed:", error);
    return externalListingsJsonFallback(
      platform,
      "unreachable",
      "Database query failed. Verify DATABASE_URL and run `npm run db:push`.",
    );
  }
}

export function computeStaleAfter(from = new Date()): string {
  return new Date(from.getTime() + STALE_HOURS * 60 * 60 * 1000).toISOString();
}

export type UpsertExternalListingInput = Omit<
  ExternalListingItem,
  "id" | "indexedAt" | "staleAfter"
> & {
  id?: string;
  indexedAt?: string;
  staleAfter?: string;
};

export function buildExternalListingId(
  source: ExternalListingSource,
  externalId: string,
): string {
  return `${source}:${externalId}`;
}

export function normalizeExternalListingInput(
  input: UpsertExternalListingInput,
): ExternalListingItem {
  const indexedAt = input.indexedAt ?? new Date().toISOString();
  return {
    id: input.id ?? buildExternalListingId(input.source, input.externalId),
    source: input.source,
    externalId: input.externalId,
    deepLinkUrl: input.deepLinkUrl,
    title: input.title,
    grade: input.grade,
    grader: input.grader ?? null,
    certNumber: input.certNumber ?? null,
    priceUsd: input.priceUsd,
    priceSol: input.priceSol,
    currency: input.currency,
    imageUrl: input.imageUrl,
    setName: input.setName ?? null,
    cardName: input.cardName ?? null,
    fmvUsd: input.fmvUsd ?? null,
    status: input.status,
    indexedAt,
    staleAfter: input.staleAfter ?? computeStaleAfter(new Date(indexedAt)),
    sellerWallet: input.sellerWallet?.trim() || null,
    listState: input.listState?.trim() || null,
  };
}

export type UpsertExternalListingsResult = {
  count: number;
  blockedReason?: string;
};

/** Operator-facing reason when sync configured DB but upsert wrote zero rows. */
export function describeExternalListingDbUpsertSkip(): string | null {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return null;

  if (shouldSkipDatabaseWrites()) {
    return `External listing DB upsert skipped (write gate): ${databaseUrlProtocolRemediation(databaseUrl)}`;
  }

  if (!isSupportedDatabaseUrl(databaseUrl)) {
    return `External listing DB upsert skipped: ${UNSUPPORTED_DATABASE_URL_HINT}`;
  }

  return null;
}

export async function upsertExternalListings(
  inputs: UpsertExternalListingInput[],
): Promise<UpsertExternalListingsResult> {
  if (inputs.length === 0) return { count: 0 };

  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return { count: 0 };

  if (shouldSkipDatabaseWrites()) {
    return {
      count: 0,
      blockedReason: describeExternalListingDbUpsertSkip() ?? undefined,
    };
  }

  if (!isSupportedDatabaseUrl(databaseUrl)) {
    logDbErrorOnce(
      "External listings DB upsert skipped (unsupported DATABASE_URL protocol):",
      databaseUrl,
    );
    return {
      count: 0,
      blockedReason: describeExternalListingDbUpsertSkip() ?? undefined,
    };
  }

  let count = 0;
  try {
    for (const raw of inputs) {
      const listing = normalizeExternalListingInput(raw);
      await prisma.externalListing.upsert({
        where: {
          source_externalId: {
            source: listing.source,
            externalId: listing.externalId,
          },
        },
        create: {
          id: listing.id,
          source: listing.source,
          externalId: listing.externalId,
          deepLinkUrl: listing.deepLinkUrl,
          title: listing.title,
          grade: listing.grade,
          grader: listing.grader,
          certNumber: listing.certNumber,
          priceUsd: listing.priceUsd,
          priceSol: listing.priceSol,
          currency: listing.currency,
          imageUrl: listing.imageUrl,
          setName: listing.setName,
          cardName: listing.cardName,
          fmvUsd: listing.fmvUsd,
          status: listing.status,
          indexedAt: new Date(listing.indexedAt),
          staleAfter: new Date(listing.staleAfter),
        },
        update: {
          deepLinkUrl: listing.deepLinkUrl,
          title: listing.title,
          grade: listing.grade,
          grader: listing.grader,
          certNumber: listing.certNumber,
          priceUsd: listing.priceUsd,
          priceSol: listing.priceSol,
          currency: listing.currency,
          imageUrl: listing.imageUrl,
          setName: listing.setName,
          cardName: listing.cardName,
          fmvUsd: listing.fmvUsd,
          status: listing.status,
          indexedAt: new Date(listing.indexedAt),
          staleAfter: new Date(listing.staleAfter),
        },
      });
      count += 1;
    }
    return { count };
  } catch (error) {
    logDbErrorOnce("External listings DB upsert failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    return {
      count: 0,
      blockedReason: `External listing DB upsert failed: ${message}. Verify DATABASE_URL connectivity and run \`npm run db:push\`.`,
    };
  }
}
