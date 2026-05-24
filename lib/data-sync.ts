import { readFile, writeFile } from "fs/promises";
import { join } from "path";

import pullsJson from "@/data/pulls.json";
import siteJson from "@/data/site.json";
import slabsJson from "@/data/slabs.json";
import { atomicWriteFile } from "@/lib/atomic-file";
import type { CollectorCryptPull } from "@/lib/scrapers/collector-crypt-scraper";
import {
  collectorCryptPullStableId,
  extractReplayIdFromClipUrl,
} from "@/lib/scrapers/collector-crypt-scraper";
import type { PullItem, SiteConfig, SlabItem } from "@/types/content";

import * as collectrScraper from "@/lib/scrapers/collectr-scraper";
import * as collectorCryptScraper from "@/lib/scrapers/collector-crypt-scraper";
import * as externalListingsSync from "@/lib/external-listings-sync";
import type { SyncExternalListingsResult } from "@/lib/external-listings-sync";
import * as solanaWallet from "@/lib/solana-wallet";
import type { VollectorSlab } from "@/lib/scrapers/vollector-scraper";
import * as vollectorScraper from "@/lib/scrapers/vollector-scraper";
import * as vaultedScraper from "@/lib/scrapers/vaulted-scraper";
import {
  databaseUrlProtocolRemediation,
  getDatabaseUrl,
} from "@/lib/db-connection";

const VOLLECTOR_PROFILE_URL = "https://vollector.id/u/SlabVaultFi";
const VAULTED_PROFILE_URL = "https://vaulted.id/u/SlabVaultFi";
const COLLECTR_SHOWCASE_URL =
  "https://app.getcollectr.com/showcase/profile/5741da44-bcb8-44cc-be7a-e33a2251d7fc";
const COLLECTOR_CRYPT_TREASURY_URL =
  "https://collectorcrypt.com/account/2oRZe7z9Jx3rpoUWuidjGhpX9mxxhtps2JqQtdxLfHwg";
const COLLECTOR_CRYPT_DEPLOYER_URL =
  "https://collectorcrypt.com/account/CWqc6DQhHxdnDSwrjG3LGnyWPQ3dRNfCY5umvTj8NBE3";
const TREASURY_WALLET = "2oRZe7z9Jx3rpoUWuidjGhpX9mxxhtps2JqQtdxLfHwg";
const DEPLOYER_WALLET = "CWqc6DQhHxdnDSwrjG3LGnyWPQ3dRNfCY5umvTj8NBE3";
const DEFAULT_STALE_MINUTES = 360;

type SyncCategory = "slabs" | "pulls" | "wallet";
type SourceAttemptStatus = "success" | "failure";
type SyncSourceState = SourceAttemptStatus | "unknown";

type SyncDiagnosticRecord = {
  lastAttemptAt: string;
  lastSuccessAt: string | null;
  lastStatus: SourceAttemptStatus;
  detail: string;
};

type SyncDiagnosticsStore = Record<string, SyncDiagnosticRecord>;

type SyncStatusRegistryEntry = {
  key: string;
  source: string;
  category: SyncCategory;
  label: string;
};

const SYNC_STATUS_REGISTRY: SyncStatusRegistryEntry[] = [
  {
    key: "slabs:collector-crypt",
    source: "collector-crypt",
    category: "slabs",
    label: "Slabs via Collector Crypt",
  },
  {
    key: "slabs:vollector",
    source: "vollector",
    category: "slabs",
    label: "Slabs via Vollector",
  },
  {
    key: "slabs:vaulted",
    source: "vaulted",
    category: "slabs",
    label: "Slabs via Vaulted",
  },
  {
    key: "slabs:collectr",
    source: "collectr",
    category: "slabs",
    label: "Slabs via Collectr",
  },
  {
    key: "pulls:collector-crypt-treasury",
    source: "collector-crypt-treasury",
    category: "pulls",
    label: "Pulls via Collector Crypt Treasury",
  },
  {
    key: "pulls:collector-crypt-deployer",
    source: "collector-crypt-deployer",
    category: "pulls",
    label: "Pulls via Collector Crypt Deployer",
  },
  {
    key: "wallet:treasury",
    source: "treasury-wallet",
    category: "wallet",
    label: "Treasury wallet RPC",
  },
  {
    key: "wallet:deployer",
    source: "deployer-wallet",
    category: "wallet",
    label: "Deployer wallet RPC",
  },
  {
    key: "external-listings:discover",
    source: "discover",
    category: "slabs",
    label: "GRAILS partner listings (sync:discover)",
  },
];

type SiteSyncConfig = SiteConfig & {
  lastSyncAttemptAt?: string;
  lastExternalListingsDbUpsertCount?: number;
  lastExternalListingsCcIngestSource?: SyncExternalListingsResult["ccIngestSource"];
  lastExternalListingsSyncErrors?: string[];
  syncDiagnostics?: SyncDiagnosticsStore;
};

export type ExternalListingsDbSyncLeg = {
  lastAttemptAt: string | null;
  lastStatus: "success" | "failure" | "unknown";
  dbUpsertCount: number | null;
  ccIngestSource: SyncExternalListingsResult["ccIngestSource"] | null;
  upsertErrors: string[];
  detail: string | null;
};

type SlabSyncAttempt = {
  source: string;
  success: boolean;
  detail: string;
};

export type SyncSourceStatus = {
  key: string;
  source: string;
  category: SyncCategory;
  label: string;
  status: SyncSourceState;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  ageMinutes: number | null;
  isStale: boolean;
  detail: string;
};

export type SyncResult = {
  success: boolean;
  timestamp: string;
  slabsUpdated: boolean;
  pullsUpdated: boolean;
  walletDataUpdated: boolean;
  externalListingsUpdated: boolean;
  externalListingsWritten: number;
  externalListingsDbUpsertCount: number;
  slabSource: string | null;
  errors: string[];
  degraded: boolean;
  staleSources: string[];
  sourceStatuses: SyncSourceStatus[];
  operatorHints: string[];
};

export type SyncStatusSnapshot = {
  lastSync: string | null;
  lastSyncAttempt: string | null;
  slabCount: number;
  pullCount: number;
  staleSources: string[];
  degraded: boolean;
  sourceStatuses: SyncSourceStatus[];
  operatorHints: string[];
};

function toDataPath(fileName: string): string {
  return join(process.cwd(), "data", fileName);
}

async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseStaleThresholdMinutes(): number {
  const raw = process.env.SYNC_STALE_MINUTES?.trim();
  if (!raw) {
    return DEFAULT_STALE_MINUTES;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_STALE_MINUTES;
  }

  return parsed;
}

function cloneDiagnostics(
  diagnostics: SyncDiagnosticsStore | undefined,
): SyncDiagnosticsStore {
  if (!diagnostics) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(diagnostics).map(([key, value]) => [key, { ...value }]),
  );
}

function toSafeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export const EXTERNAL_LISTINGS_DISCOVER_KEY = "external-listings:discover";

/** Append CC ingest source to legacy discover detail when persisted separately. */
export function applyCcIngestSourceToDiscoverDetail(
  detail: string,
  ccIngestSource: SyncExternalListingsResult["ccIngestSource"] | null | undefined,
): string {
  if (!ccIngestSource || /CC \d+ \([^)]+\)/.test(detail)) {
    return detail;
  }

  return detail.replace(/CC (\d+)/, `CC $1 (${ccIngestSource})`);
}

function parseDbUpsertCountFromDetail(detail: string): number | null {
  const match = detail.match(/db upsert (\d+)/i);
  if (!match) {
    return null;
  }
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function isUpsertRelatedSyncError(message: string): boolean {
  return /upsert|external listing db/i.test(message);
}

export type ExternalListingsDbOperatorHintLeg = Pick<
  ExternalListingsDbSyncLeg,
  "dbUpsertCount" | "upsertErrors" | "lastAttemptAt"
>;

/** Operator hints when DATABASE_URL is set but discover upsert wrote zero rows or failed. */
export function buildExternalListingsDbOperatorHints(
  leg: ExternalListingsDbOperatorHintLeg | null | undefined,
  databaseUrl: string | null = getDatabaseUrl(),
): string[] {
  if (!databaseUrl || !leg?.lastAttemptAt) {
    return [];
  }

  const zeroUpserts = leg.dbUpsertCount === 0 || leg.dbUpsertCount === null;
  const hasUpsertErrors = leg.upsertErrors.length > 0;
  if (!zeroUpserts && !hasUpsertErrors) {
    return [];
  }

  const parts: string[] = [];
  if (zeroUpserts) {
    parts.push(`dbUpsertCount=${leg.dbUpsertCount ?? 0}`);
  }
  if (hasUpsertErrors) {
    parts.push(`upsert errors: ${leg.upsertErrors.join("; ")}`);
  }

  const protocolRemediation = databaseUrlProtocolRemediation(databaseUrl);
  return [
    `GRAILS partner listings Postgres upsert leg unhealthy (${parts.join("; ")}). Run npm run db:preflight:warn, then npm run sync:discover. ${protocolRemediation}`,
  ];
}
const DEFAULT_EXTERNAL_LISTINGS_MAX_ATTEMPTS = 3;
const EXTERNAL_LISTINGS_RETRY_BASE_MS = 400;

function parseExternalListingsMaxAttempts(): number {
  const raw = process.env.SYNC_EXTERNAL_LISTINGS_MAX_ATTEMPTS?.trim();
  if (!raw) {
    return DEFAULT_EXTERNAL_LISTINGS_MAX_ATTEMPTS;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_EXTERNAL_LISTINGS_MAX_ATTEMPTS;
  }

  return Math.min(parsed, 10);
}

/** Operator-facing message when sync:discover throws after all retries. */
export function formatExternalListingsSyncFailure(
  error: unknown,
  attempt: number,
  maxAttempts: number,
): string {
  const detail = toSafeErrorMessage(error);
  if (maxAttempts <= 1) {
    return `GRAILS partner listings (sync:discover) failed: ${detail}`;
  }
  return `GRAILS partner listings (sync:discover) failed after ${attempt}/${maxAttempts} attempts: ${detail}`;
}

/** Prefix partial upstream/DB errors from syncExternalListingsToJson. */
export function formatExternalListingsSyncWarnings(errors: string[]): string[] {
  if (errors.length === 0) {
    return [];
  }

  return errors.map((error) =>
    error.startsWith("GRAILS partner listings")
      ? error
      : `GRAILS partner listings (sync:discover): ${error}`,
  );
}

function externalListingsRetryDelayMs(attempt: number): number {
  return EXTERNAL_LISTINGS_RETRY_BASE_MS * attempt;
}

async function delayMs(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function diffMinutes(fromIso: string, toIso: string): number | null {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) {
    return null;
  }
  return Math.floor((to - from) / 60_000);
}

function formatAgeMinutes(ageMinutes: number): string {
  if (ageMinutes < 60) {
    return `${ageMinutes}m`;
  }

  const hours = Math.floor(ageMinutes / 60);
  const minutes = ageMinutes % 60;
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

function updateSourceDiagnostic(
  diagnostics: SyncDiagnosticsStore,
  key: string,
  status: SourceAttemptStatus,
  atIso: string,
  detail: string,
): void {
  const previous = diagnostics[key];
  diagnostics[key] = {
    lastAttemptAt: atIso,
    lastStatus: status,
    lastSuccessAt:
      status === "success" ? atIso : (previous?.lastSuccessAt ?? null),
    detail,
  };
}

function inferRegistryEntry(key: string): SyncStatusRegistryEntry {
  const [categoryRaw, sourceRaw] = key.split(":");
  const category =
    categoryRaw === "pulls" || categoryRaw === "wallet" || categoryRaw === "slabs"
      ? categoryRaw
      : "slabs";
  const source = sourceRaw ?? key;
  return {
    key,
    source,
    category,
    label: `${category} via ${source}`,
  };
}

export function evaluateSyncSourceStatuses(
  diagnostics: SyncDiagnosticsStore | undefined,
  nowIso: string = new Date().toISOString(),
  staleThresholdMinutes: number = DEFAULT_STALE_MINUTES,
): SyncSourceStatus[] {
  const knownEntries = [...SYNC_STATUS_REGISTRY];
  const knownKeys = new Set(knownEntries.map((entry) => entry.key));

  if (diagnostics) {
    for (const key of Object.keys(diagnostics)) {
      if (!knownKeys.has(key)) {
        knownEntries.push(inferRegistryEntry(key));
      }
    }
  }

  return knownEntries.map((entry) => {
    const record = diagnostics?.[entry.key];
    const ageMinutes = record?.lastSuccessAt
      ? diffMinutes(record.lastSuccessAt, nowIso)
      : null;
    const status: SyncSourceState = record?.lastStatus ?? "unknown";
    const isStale =
      status !== "unknown" &&
      (record?.lastSuccessAt === null ||
        record?.lastSuccessAt === undefined ||
        ageMinutes === null ||
        ageMinutes > staleThresholdMinutes);

    return {
      key: entry.key,
      source: entry.source,
      category: entry.category,
      label: entry.label,
      status,
      lastAttemptAt: record?.lastAttemptAt ?? null,
      lastSuccessAt: record?.lastSuccessAt ?? null,
      ageMinutes,
      isStale,
      detail: record?.detail ?? "No sync attempt recorded yet.",
    };
  });
}

export function buildSyncOperatorHints(
  sourceStatuses: SyncSourceStatus[],
  staleThresholdMinutes: number = DEFAULT_STALE_MINUTES,
  externalListingsDbLeg?: ExternalListingsDbOperatorHintLeg | null,
  databaseUrl: string | null = getDatabaseUrl(),
): string[] {
  if (sourceStatuses.length === 0) {
    return ["No sync diagnostics recorded yet. Run npm run sync to initialize."];
  }

  const hints = new Set<string>();
  for (const hint of buildExternalListingsDbOperatorHints(
    externalListingsDbLeg,
    databaseUrl,
  )) {
    hints.add(hint);
  }
  for (const status of sourceStatuses) {
    if (status.status === "failure" && status.lastSuccessAt) {
      const cachedAge =
        status.ageMinutes === null ? "an unknown age" : formatAgeMinutes(status.ageMinutes);
      hints.add(
        `${status.label} failed last attempt; serving cached data (${cachedAge} old).`,
      );
    } else if (status.status === "failure" && !status.lastSuccessAt) {
      hints.add(
        `${status.label} has never completed a successful sync. Verify upstream availability and credentials.`,
      );
    }

    if (status.isStale && status.lastSuccessAt) {
      hints.add(
        `${status.label} data age exceeds ${staleThresholdMinutes}m. Consider a manual sync or upstream check.`,
      );
    }
  }

  if (hints.size === 0) {
    hints.add("All attempted sync sources report recent successful attempts.");
  }

  return Array.from(hints);
}

function toCollectorCryptPullItem(pull: CollectorCryptPull): PullItem {
  const replayId = extractReplayIdFromClipUrl(pull.clipUrl);
  return {
    id: collectorCryptPullStableId(pull),
    date: pull.date,
    source: pull.source,
    summary: pull.summary,
    costUsd: pull.costUsd,
    outcomeUsd: pull.outcomeUsd,
    clipUrl: pull.clipUrl,
    ...(replayId ? { replayId } : {}),
  };
}

/** Dedupe pulls by replay ID (later rows win; preserve imageUrl from earlier). */
export function dedupePullItemsByReplayId(pulls: PullItem[]): PullItem[] {
  const byReplayId = new Map<string, PullItem>();
  const withoutReplay: PullItem[] = [];

  for (const pull of pulls) {
    const replayId = pull.replayId ?? extractReplayIdFromClipUrl(pull.clipUrl);
    if (replayId) {
      const stableId = `cc-replay-${replayId}`;
      const existing = byReplayId.get(replayId);
      byReplayId.set(
        replayId,
        existing
          ? {
              ...existing,
              ...pull,
              id: stableId,
              replayId,
              imageUrl: pull.imageUrl ?? existing.imageUrl,
            }
          : { ...pull, id: stableId, replayId },
      );
      continue;
    }

    const idx = withoutReplay.findIndex((row) => row.id === pull.id);
    if (idx >= 0) {
      withoutReplay[idx] = {
        ...withoutReplay[idx],
        ...pull,
        imageUrl: pull.imageUrl ?? withoutReplay[idx].imageUrl,
      };
    } else {
      withoutReplay.push(pull);
    }
  }

  return [...byReplayId.values(), ...withoutReplay];
}

/** Merge synced Collector Crypt pulls into existing cache with replay dedupe. */
export function mergeCollectorCryptPulls(
  existing: PullItem[],
  incoming: CollectorCryptPull[],
): PullItem[] {
  return dedupePullItemsByReplayId([
    ...existing,
    ...incoming.map(toCollectorCryptPullItem),
  ]);
}

function toSlabItem(slab: VollectorSlab): SlabItem {
  return {
    id: slab.id,
    name: slab.name,
    grade: slab.grade,
    estimatedValueUsd: slab.estimatedValueUsd,
    acquiredAt: slab.acquiredAt,
    imageUrl: slab.imageUrl,
    vaultedUrl: slab.itemUrl,
    collectrUrl: slab.collectrUrl ?? "",
  };
}

/**
 * Slab sources in priority order: Collector Crypt → Vollector → Vaulted → Collectr.
 */
async function fetchSlabsWithFallback(): Promise<{
  slabs: SlabItem[];
  source: string | null;
  attempts: SlabSyncAttempt[];
}> {
  const attempts: SlabSyncAttempt[] = [];

  console.log("Trying Collector Crypt treasury accounts...");
  try {
    const ccSlabs = await collectorCryptScraper.fetchCollectorCryptSlabs([
      COLLECTOR_CRYPT_TREASURY_URL,
      COLLECTOR_CRYPT_DEPLOYER_URL,
    ]);
    if (ccSlabs?.length) {
      attempts.push({
        source: "collector-crypt",
        success: true,
        detail: `Fetched ${ccSlabs.length} slabs.`,
      });
      return {
        slabs: ccSlabs.map(toSlabItem),
        source: "collector-crypt",
        attempts,
      };
    }
    attempts.push({
      source: "collector-crypt",
      success: false,
      detail: "Source returned no slabs.",
    });
  } catch (error) {
    attempts.push({
      source: "collector-crypt",
      success: false,
      detail: `Source request failed: ${toSafeErrorMessage(error)}`,
    });
  }

  console.log("Collector Crypt empty, trying Vollector...");
  try {
    const vollectorSlabs = await vollectorScraper.fetchVollectorData(
      VOLLECTOR_PROFILE_URL,
    );
    if (vollectorSlabs?.length) {
      attempts.push({
        source: "vollector",
        success: true,
        detail: `Fetched ${vollectorSlabs.length} slabs.`,
      });
      return {
        slabs: vollectorSlabs.map(toSlabItem),
        source: "vollector",
        attempts,
      };
    }
    attempts.push({
      source: "vollector",
      success: false,
      detail: "Source returned no slabs.",
    });
  } catch (error) {
    attempts.push({
      source: "vollector",
      success: false,
      detail: `Source request failed: ${toSafeErrorMessage(error)}`,
    });
  }

  console.log("Vollector empty, trying Vaulted...");
  try {
    const vaultedSlabs = await vaultedScraper.fetchVaultedData(
      VAULTED_PROFILE_URL,
    );
    if (vaultedSlabs?.length) {
      attempts.push({
        source: "vaulted",
        success: true,
        detail: `Fetched ${vaultedSlabs.length} slabs.`,
      });
      return {
        slabs: vaultedSlabs.map((slab) => ({
          id: slab.id,
          name: slab.name,
          grade: slab.grade,
          estimatedValueUsd: slab.estimatedValueUsd,
          acquiredAt: slab.acquiredAt,
          imageUrl: slab.imageUrl,
          vaultedUrl: slab.vaultedUrl,
          collectrUrl: slab.collectrUrl ?? "",
        })),
        source: "vaulted",
        attempts,
      };
    }
    attempts.push({
      source: "vaulted",
      success: false,
      detail: "Source returned no slabs.",
    });
  } catch (error) {
    attempts.push({
      source: "vaulted",
      success: false,
      detail: `Source request failed: ${toSafeErrorMessage(error)}`,
    });
  }

  console.log("Vaulted empty, trying Collectr...");
  try {
    const collectrSlabs = await collectrScraper.scrapeCollectrShowcase(
      COLLECTR_SHOWCASE_URL,
    );
    if (collectrSlabs?.length) {
      attempts.push({
        source: "collectr",
        success: true,
        detail: `Fetched ${collectrSlabs.length} slabs.`,
      });
      return {
        slabs: collectrSlabs.map(toSlabItem),
        source: "collectr",
        attempts,
      };
    }
    attempts.push({
      source: "collectr",
      success: false,
      detail: "Source returned no slabs.",
    });
  } catch (error) {
    attempts.push({
      source: "collectr",
      success: false,
      detail: `Source request failed: ${toSafeErrorMessage(error)}`,
    });
  }

  return { slabs: [], source: null, attempts };
}

export type SyncAllDataOptions = {
  /** Test hook: bypass partner ingest network when verifying sync diagnostics. */
  externalSyncToJson?: () => Promise<SyncExternalListingsResult>;
  /** Test hook: skip slab/pull/wallet upstream when asserting discover diagnostics only. */
  skipUpstreamSync?: boolean;
};

/**
 * Main data sync function - fetches data from all sources and updates JSON files.
 */
export async function syncAllData(
  options?: SyncAllDataOptions,
): Promise<SyncResult> {
  const timestamp = new Date().toISOString();
  const staleThresholdMinutes = parseStaleThresholdMinutes();
  const sitePath = toDataPath("site.json");
  const currentSite = await readJsonFile<SiteSyncConfig>(
    sitePath,
    siteJson as SiteSyncConfig,
  );
  const sourceDiagnostics = cloneDiagnostics(currentSite.syncDiagnostics);

  const result: SyncResult = {
    success: false,
    timestamp,
    slabsUpdated: false,
    pullsUpdated: false,
    walletDataUpdated: false,
    externalListingsUpdated: false,
    externalListingsWritten: 0,
    externalListingsDbUpsertCount: 0,
    slabSource: null,
    errors: [],
    degraded: false,
    staleSources: [],
    sourceStatuses: [],
    operatorHints: [],
  };

  try {
    console.log("Starting data sync at:", result.timestamp);

    let walletResult: Awaited<ReturnType<typeof syncWalletData>> = {
      updated: false,
      sitePatch: {},
      errors: [],
    };

    if (!options?.skipUpstreamSync) {
      const slabsResult = await syncSlabs(sourceDiagnostics, result.timestamp);
      result.slabsUpdated = slabsResult.updated;
      result.slabSource = slabsResult.source;
      if (!slabsResult.updated) {
        result.errors.push(
          slabsResult.source
            ? "Slab sync returned no changes"
            : "Failed to sync slabs from all sources (keeping existing data)",
        );
      }

      const pullsResult = await syncPulls(sourceDiagnostics, result.timestamp);
      result.pullsUpdated = pullsResult.updated;
      if (!pullsResult.updated) {
        result.errors.push(
          "Failed to sync pulls from Collector Crypt (keeping existing data)",
        );
      }

      walletResult = await syncWalletData(
        sourceDiagnostics,
        result.timestamp,
        currentSite,
      );
      result.walletDataUpdated = walletResult.updated;
      if (!walletResult.updated) {
        result.errors.push("Failed to sync wallet data from all configured wallets");
      }
      result.errors.push(...walletResult.errors);
    }

    const externalResult = await syncExternalListings(
      sourceDiagnostics,
      result.timestamp,
      options?.externalSyncToJson,
    );
    result.externalListingsUpdated = externalResult.updated;
    result.externalListingsWritten = externalResult.written;
    result.externalListingsDbUpsertCount = externalResult.dbUpsertCount;
    if (externalResult.errors.length > 0) {
      result.errors.push(...externalResult.errors);
    }

    const nextSite: SiteSyncConfig = {
      ...currentSite,
      ...walletResult.sitePatch,
      lastSyncAttemptAt: result.timestamp,
      lastExternalListingsDbUpsertCount: externalResult.dbUpsertCount,
      ...(externalResult.ccIngestSource != null
        ? {
            lastExternalListingsCcIngestSource: externalResult.ccIngestSource,
          }
        : {}),
      lastExternalListingsSyncErrors:
        externalResult.errors.length > 0 ? externalResult.errors : undefined,
      syncDiagnostics: sourceDiagnostics,
    };

    if (result.slabsUpdated || result.pullsUpdated || result.walletDataUpdated) {
      nextSite.lastSyncAt = result.timestamp;
    }

    result.success =
      result.slabsUpdated ||
      result.pullsUpdated ||
      result.walletDataUpdated ||
      result.externalListingsUpdated;
    await atomicWriteFile(sitePath, JSON.stringify(nextSite, null, 2));

    result.sourceStatuses = evaluateSyncSourceStatuses(
      sourceDiagnostics,
      result.timestamp,
      staleThresholdMinutes,
    );
    result.staleSources = result.sourceStatuses
      .filter((status) => status.status !== "unknown" && status.isStale)
      .map((status) => status.key);
    result.operatorHints = buildSyncOperatorHints(
      result.sourceStatuses,
      staleThresholdMinutes,
      {
        dbUpsertCount: externalResult.dbUpsertCount,
        upsertErrors: externalResult.errors.filter(isUpsertRelatedSyncError),
        lastAttemptAt: result.timestamp,
      },
    );
    result.degraded =
      !result.success ||
      result.errors.length > 0 ||
      result.sourceStatuses.some(
        (status) =>
          status.status === "failure" ||
          (status.status === "success" && status.isStale),
      );

    console.log("Data sync completed:", result);

    return result;
  } catch (error) {
    console.error("Error during data sync:", error);
    result.errors.push(toSafeErrorMessage(error));
    result.sourceStatuses = evaluateSyncSourceStatuses(
      sourceDiagnostics,
      result.timestamp,
      staleThresholdMinutes,
    );
    result.staleSources = result.sourceStatuses
      .filter((status) => status.status !== "unknown" && status.isStale)
      .map((status) => status.key);
    result.operatorHints = buildSyncOperatorHints(
      result.sourceStatuses,
      staleThresholdMinutes,
    );
    result.degraded = true;
    return result;
  }
}

export async function syncExternalListings(
  diagnostics: SyncDiagnosticsStore,
  timestamp: string,
  syncToJson: () => Promise<SyncExternalListingsResult> =
    externalListingsSync.syncExternalListingsToJson,
): Promise<{
  updated: boolean;
  written: number;
  dbUpsertCount: number;
  ccIngestSource: SyncExternalListingsResult["ccIngestSource"] | null;
  errors: string[];
}> {
  const key = EXTERNAL_LISTINGS_DISCOVER_KEY;
  const maxAttempts = parseExternalListingsMaxAttempts();
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await syncToJson();
      const updated = result.totalWritten > 0 || result.dbUpsertCount > 0;
      const detail = [
        `CC ${result.collectorCryptCount} (${result.ccIngestSource})`,
        `Phygitals ${result.phygitalsCount}`,
        `total ${result.totalWritten}`,
        result.dbUpsertCount > 0 ? `db upsert ${result.dbUpsertCount}` : null,
        !result.success && result.errors.length > 0
          ? `warnings: ${result.errors.join("; ")}`
          : null,
      ]
        .filter(Boolean)
        .join("; ");

      const formattedErrors = formatExternalListingsSyncWarnings(result.errors);
      if (!result.success && formattedErrors.length === 0 && !updated) {
        formattedErrors.push(
          "GRAILS partner listings (sync:discover): no listings written and no upstream data fetched.",
        );
      }

      updateSourceDiagnostic(
        diagnostics,
        key,
        result.success ? "success" : "failure",
        timestamp,
        detail || "No external listings written.",
      );

      return {
        updated,
        written: result.totalWritten,
        dbUpsertCount: result.dbUpsertCount,
        ccIngestSource: result.ccIngestSource,
        errors: formattedErrors,
      };
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        console.warn(
          `External listings sync attempt ${attempt}/${maxAttempts} failed: ${toSafeErrorMessage(error)}. Retrying...`,
        );
        await delayMs(externalListingsRetryDelayMs(attempt));
        continue;
      }
    }
  }

  const message = formatExternalListingsSyncFailure(
    lastError,
    maxAttempts,
    maxAttempts,
  );
  updateSourceDiagnostic(diagnostics, key, "failure", timestamp, message);
  return {
    updated: false,
    written: 0,
    dbUpsertCount: 0,
    ccIngestSource: null,
    errors: [message],
  };
}

async function syncSlabs(
  diagnostics: SyncDiagnosticsStore,
  timestamp: string,
): Promise<{ updated: boolean; source: string | null }> {
  try {
    const fetched = await fetchSlabsWithFallback();
    for (const attempt of fetched.attempts) {
      updateSourceDiagnostic(
        diagnostics,
        `slabs:${attempt.source}`,
        attempt.success ? "success" : "failure",
        timestamp,
        attempt.detail,
      );
    }

    if (!fetched.slabs.length) {
      console.log("No slab data found from any source, keeping existing data");
      return { updated: false, source: null };
    }

    const slabsPath = toDataPath("slabs.json");
    await writeFile(slabsPath, JSON.stringify(fetched.slabs, null, 2), "utf-8");

    console.log(`Updated ${fetched.slabs.length} slabs from ${fetched.source}`);
    return { updated: true, source: fetched.source };
  } catch (error) {
    console.error("Error syncing slabs:", error);
    updateSourceDiagnostic(
      diagnostics,
      "slabs:collector-crypt",
      "failure",
      timestamp,
      `Slab sync pipeline error: ${toSafeErrorMessage(error)}`,
    );
    return { updated: false, source: null };
  }
}

async function syncPulls(
  diagnostics: SyncDiagnosticsStore,
  timestamp: string,
): Promise<{ updated: boolean }> {
  try {
    console.log("Syncing pulls from Collector Crypt...");

    let collectorPulls: CollectorCryptPull[] | null =
      await collectorCryptScraper.fetchCollectorCryptData(
        COLLECTOR_CRYPT_TREASURY_URL,
      );
    let sourceKey = "pulls:collector-crypt-treasury";

    if (collectorPulls?.length) {
      updateSourceDiagnostic(
        diagnostics,
        sourceKey,
        "success",
        timestamp,
        `Fetched ${collectorPulls.length} pulls.`,
      );
    } else {
      updateSourceDiagnostic(
        diagnostics,
        sourceKey,
        "failure",
        timestamp,
        "Source returned no pulls.",
      );
    }

    if (!collectorPulls?.length) {
      collectorPulls = await collectorCryptScraper.fetchCollectorCryptData(
        COLLECTOR_CRYPT_DEPLOYER_URL,
      );
      sourceKey = "pulls:collector-crypt-deployer";
      if (collectorPulls?.length) {
        updateSourceDiagnostic(
          diagnostics,
          sourceKey,
          "success",
          timestamp,
          `Fetched ${collectorPulls.length} pulls.`,
        );
      } else {
        updateSourceDiagnostic(
          diagnostics,
          sourceKey,
          "failure",
          timestamp,
          "Source returned no pulls.",
        );
      }
    }

    if (!collectorPulls?.length) {
      console.log("No pull data found from Collector Crypt, keeping existing data");
      return { updated: false };
    }

    const pullsPath = toDataPath("pulls.json");
    const existingPulls = await readJsonFile<PullItem[]>(
      pullsPath,
      pullsJson as PullItem[],
    );
    const pulls = mergeCollectorCryptPulls(existingPulls, collectorPulls);

    await writeFile(pullsPath, JSON.stringify(pulls, null, 2), "utf-8");

    console.log(`Updated ${pulls.length} pulls`);
    return { updated: true };
  } catch (error) {
    console.error("Error syncing pulls:", error);
    updateSourceDiagnostic(
      diagnostics,
      "pulls:collector-crypt-treasury",
      "failure",
      timestamp,
      `Pull sync pipeline error: ${toSafeErrorMessage(error)}`,
    );
    return { updated: false };
  }
}

async function syncWalletData(
  diagnostics: SyncDiagnosticsStore,
  timestamp: string,
  site: SiteSyncConfig,
): Promise<{
  updated: boolean;
  sitePatch: Partial<SiteSyncConfig>;
  errors: string[];
}> {
  const errors: string[] = [];
  const sitePatch: Partial<SiteSyncConfig> = {};

  try {
    console.log("Syncing wallet data from Solana...");

    const treasuryData = await solanaWallet
      .getWalletData(TREASURY_WALLET)
      .catch(() => null);
    if (treasuryData) {
      sitePatch.treasuryBalanceSol = treasuryData.balanceSol;
      updateSourceDiagnostic(
        diagnostics,
        "wallet:treasury",
        "success",
        timestamp,
        `Fetched balance ${treasuryData.balanceSol} SOL.`,
      );
    } else {
      errors.push("Treasury wallet fetch failed (retaining last known balance).");
      updateSourceDiagnostic(
        diagnostics,
        "wallet:treasury",
        "failure",
        timestamp,
        "Failed to fetch wallet balance.",
      );
    }

    const deployerData = await solanaWallet
      .getWalletData(DEPLOYER_WALLET)
      .catch(() => null);
    if (deployerData) {
      sitePatch.deployerBalanceSol = deployerData.balanceSol;
      updateSourceDiagnostic(
        diagnostics,
        "wallet:deployer",
        "success",
        timestamp,
        `Fetched balance ${deployerData.balanceSol} SOL.`,
      );
    } else {
      errors.push("Deployer wallet fetch failed (retaining last known balance).");
      updateSourceDiagnostic(
        diagnostics,
        "wallet:deployer",
        "failure",
        timestamp,
        "Failed to fetch wallet balance.",
      );
    }

    const hadTreasuryBalance =
      typeof sitePatch.treasuryBalanceSol === "number" ||
      typeof site.treasuryBalanceSol === "number";
    const hadDeployerBalance =
      typeof sitePatch.deployerBalanceSol === "number" ||
      typeof site.deployerBalanceSol === "number";

    if (!hadTreasuryBalance && !hadDeployerBalance) {
      return { updated: false, sitePatch: {}, errors };
    }

    if (
      typeof sitePatch.treasuryBalanceSol === "number" ||
      typeof sitePatch.deployerBalanceSol === "number"
    ) {
      sitePatch.lastWalletSync = timestamp;
      return { updated: true, sitePatch, errors };
    }

    return { updated: false, sitePatch: {}, errors };
  } catch (error) {
    console.error("Error syncing wallet data:", error);
    errors.push(`Wallet sync error: ${toSafeErrorMessage(error)}`);
    updateSourceDiagnostic(
      diagnostics,
      "wallet:treasury",
      "failure",
      timestamp,
      "Wallet sync failed before completion.",
    );
    updateSourceDiagnostic(
      diagnostics,
      "wallet:deployer",
      "failure",
      timestamp,
      "Wallet sync failed before completion.",
    );
    return { updated: false, sitePatch: {}, errors };
  }
}

export async function manualSync(): Promise<SyncResult> {
  console.log("Running manual data sync...");
  return syncAllData();
}

export async function getExternalListingsDbSyncLeg(): Promise<ExternalListingsDbSyncLeg> {
  const site = await readJsonFile<SiteSyncConfig>(
    toDataPath("site.json"),
    siteJson as SiteSyncConfig,
  );
  const record = site.syncDiagnostics?.[EXTERNAL_LISTINGS_DISCOVER_KEY];
  const parsedCount =
    record?.detail !== undefined
      ? parseDbUpsertCountFromDetail(record.detail)
      : null;
  const dbUpsertCount =
    typeof site.lastExternalListingsDbUpsertCount === "number"
      ? site.lastExternalListingsDbUpsertCount
      : parsedCount;
  const syncErrors = site.lastExternalListingsSyncErrors ?? [];
  const upsertErrors = syncErrors.filter(isUpsertRelatedSyncError);

  return {
    lastAttemptAt: record?.lastAttemptAt ?? null,
    lastStatus: record?.lastStatus ?? "unknown",
    dbUpsertCount,
    ccIngestSource: site.lastExternalListingsCcIngestSource ?? null,
    upsertErrors,
    detail: record?.detail ?? null,
  };
}

export async function getSyncStatus(): Promise<SyncStatusSnapshot> {
  const staleThresholdMinutes = parseStaleThresholdMinutes();
  const site = await readJsonFile<SiteSyncConfig>(
    toDataPath("site.json"),
    siteJson as SiteSyncConfig,
  );
  const slabs = await readJsonFile<SlabItem[]>(
    toDataPath("slabs.json"),
    slabsJson as SlabItem[],
  );
  const pulls = await readJsonFile<PullItem[]>(
    toDataPath("pulls.json"),
    pullsJson as PullItem[],
  );
  const sourceStatuses = evaluateSyncSourceStatuses(
    site.syncDiagnostics,
    new Date().toISOString(),
    staleThresholdMinutes,
  );
  const discoverIndex = sourceStatuses.findIndex(
    (status) => status.key === EXTERNAL_LISTINGS_DISCOVER_KEY,
  );
  if (discoverIndex >= 0 && site.lastExternalListingsCcIngestSource) {
    sourceStatuses[discoverIndex] = {
      ...sourceStatuses[discoverIndex],
      detail: applyCcIngestSourceToDiscoverDetail(
        sourceStatuses[discoverIndex].detail,
        site.lastExternalListingsCcIngestSource,
      ),
    };
  }
  const staleSources = sourceStatuses
    .filter((status) => status.status !== "unknown" && status.isStale)
    .map((status) => status.key);
  const externalListingsDbLeg = await getExternalListingsDbSyncLeg();

  return {
    lastSync: site.lastSyncAt ?? site.lastWalletSync ?? null,
    lastSyncAttempt: site.lastSyncAttemptAt ?? null,
    slabCount: slabs.length,
    pullCount: pulls.length,
    staleSources,
    degraded: sourceStatuses.some(
      (status) =>
        status.status === "failure" ||
        (status.status === "success" && status.isStale),
    ),
    sourceStatuses,
    operatorHints: buildSyncOperatorHints(
      sourceStatuses,
      staleThresholdMinutes,
      externalListingsDbLeg,
    ),
  };
}
