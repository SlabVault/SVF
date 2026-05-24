import { readFile, writeFile } from "fs/promises";
import { join } from "path";

import {
  fetchCollectorCryptIngestListings,
  type CollectorCryptIngestSource,
} from "@/lib/collector-crypt-live-listings";
import {
  buildExternalListingId,
  computeStaleAfter,
  describeExternalListingDbUpsertSkip,
  normalizeExternalListingInput,
  upsertExternalListings,
  type UpsertExternalListingInput,
} from "@/lib/external-listings";
import { getDatabaseUrl } from "@/lib/db-connection";
import { refreshPhygitalsSeedRows } from "@/lib/phygitals-listings";
import type { ExternalListingItem } from "@/types/external-listing";

const EXTERNAL_LISTINGS_PATH = join(
  process.cwd(),
  "data",
  "external-listings.json",
);

export type SyncExternalListingsResult = {
  success: boolean;
  collectorCryptCount: number;
  phygitalsCount: number;
  manualPreserved: number;
  totalWritten: number;
  dbUpsertCount: number;
  ccIngestSource: CollectorCryptIngestSource | "cached";
  dbConfigured: boolean;
  errors: string[];
};

export {
  fetchCollectorCryptIngestListings,
  fetchCollectorCryptListings,
} from "@/lib/collector-crypt-live-listings";

export function resolveSyncExternalListingsSuccess(params: {
  errors: string[];
  mergedCount: number;
  ccFetchFailed: boolean;
  preservedNonCcCount: number;
  retainedCcCount: number;
}): boolean {
  if (params.errors.length === 0) return true;
  if (params.mergedCount === 0) return false;
  if (
    params.ccFetchFailed &&
    (params.preservedNonCcCount > 0 || params.retainedCcCount > 0)
  ) {
    return true;
  }
  return false;
}

type ExternalListingsSyncDeps = {
  fetchCollectorCryptIngestListings: typeof fetchCollectorCryptIngestListings;
  readExistingListings: () => Promise<ExternalListingItem[]>;
  writeListings: (merged: ExternalListingItem[]) => Promise<void>;
  upsertExternalListings: typeof upsertExternalListings;
  getDatabaseUrl: typeof getDatabaseUrl;
};

async function readExistingListings(): Promise<ExternalListingItem[]> {
  try {
    const raw = await readFile(EXTERNAL_LISTINGS_PATH, "utf8");
    const parsed = JSON.parse(raw) as ExternalListingItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const defaultSyncDeps: ExternalListingsSyncDeps = {
  fetchCollectorCryptIngestListings,
  readExistingListings,
  writeListings: async (merged) => {
    await writeFile(
      EXTERNAL_LISTINGS_PATH,
      `${JSON.stringify(merged, null, 2)}\n`,
    );
  },
  upsertExternalListings,
  getDatabaseUrl,
};

let syncDeps: ExternalListingsSyncDeps = defaultSyncDeps;

export function __setExternalListingsSyncDepsForTests(
  overrides: Partial<ExternalListingsSyncDeps> | null,
): void {
  syncDeps = overrides
    ? { ...defaultSyncDeps, ...overrides }
    : defaultSyncDeps;
}

/**
 * Sync Collector Crypt account inventory into external listing seed JSON.
 * Preserves manual / phygitals rows from the existing file.
 */
export async function syncExternalListingsToJson(): Promise<SyncExternalListingsResult> {
  const errors: string[] = [];
  let ccListings: UpsertExternalListingInput[] = [];
  let ccFetchFailed = false;
  let ccIngestSource: SyncExternalListingsResult["ccIngestSource"] = "none";

  try {
    const ingest = await syncDeps.fetchCollectorCryptIngestListings();
    ccListings = ingest.listings;
    ccIngestSource = ingest.source;
  } catch (error) {
    ccFetchFailed = true;
    ccIngestSource = "none";
    errors.push(
      error instanceof Error
        ? `Collector Crypt ingest failed: ${error.message}`
        : "Collector Crypt ingest failed unexpectedly.",
    );
  }

  const existing = await syncDeps.readExistingListings();
  const preserved = existing.filter((row) => row.source !== "collector_crypt");
  const indexedAt = new Date().toISOString();
  const staleAfter = computeStaleAfter(new Date(indexedAt));
  const preservedRefreshed = refreshPhygitalsSeedRows(
    preserved,
    indexedAt,
    staleAfter,
  );

  let ccRows: ExternalListingItem[] = [];
  if (ccListings.length > 0) {
    ccRows = ccListings.map((input) =>
      normalizeExternalListingInput({
        ...input,
        id: buildExternalListingId(input.source, input.externalId),
        indexedAt,
        staleAfter,
      }),
    );
  } else if (existing.some((row) => row.source === "collector_crypt")) {
    ccRows = existing.filter((row) => row.source === "collector_crypt");
    ccIngestSource = "cached";
  }

  const merged = [...ccRows, ...preservedRefreshed];
  await syncDeps.writeListings(merged);

  const phygitalsCount = merged.filter(
    (row) => row.source === "phygitals" && row.status === "active",
  ).length;

  let dbUpsertCount = 0;
  const dbConfigured = Boolean(syncDeps.getDatabaseUrl());
  const activeForDb = merged.filter((row) => row.status === "active");
  if (dbConfigured && activeForDb.length > 0) {
    try {
      const upsertOutcome = await syncDeps.upsertExternalListings(activeForDb);
      dbUpsertCount = upsertOutcome.count;
      if (dbUpsertCount === 0) {
        const blockedReason =
          upsertOutcome.blockedReason ??
          describeExternalListingDbUpsertSkip() ??
          `External listing DB upsert wrote 0 rows for ${activeForDb.length} active listing(s). Verify DATABASE_URL and Postgres connectivity.`;
        errors.push(blockedReason);
      }
    } catch (error) {
      errors.push(
        error instanceof Error
          ? error.message
          : "External listing DB upsert failed unexpectedly.",
      );
    }
  }

  const success = resolveSyncExternalListingsSuccess({
    errors,
    mergedCount: merged.length,
    ccFetchFailed,
    preservedNonCcCount: preservedRefreshed.length,
    retainedCcCount: ccRows.length,
  });

  return {
    success,
    collectorCryptCount: ccRows.length,
    phygitalsCount,
    manualPreserved: preservedRefreshed.length,
    totalWritten: merged.length,
    dbUpsertCount,
    ccIngestSource,
    dbConfigured,
    errors,
  };
}
