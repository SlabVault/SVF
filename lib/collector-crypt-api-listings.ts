/**
 * Collector Crypt marketplace API — preferred over live HTML scrape on read paths.
 * Tries known public API candidates; returns [] when none respond (scrape is fallback).
 */

import siteJson from "@/data/site.json";
import type { UpsertExternalListingInput } from "@/lib/external-listings";
import {
  SCRAPER_MAX_RESPONSE_BYTES,
  SCRAPER_TIMEOUT_MS,
  SCRAPER_USER_AGENT,
} from "@/lib/scrapers/scraper-utils";

/** CC ingest probes known public API candidates before HTML scrape. */
export const COLLECTOR_CRYPT_MARKETPLACE_API_AVAILABLE = true;

type ApiSlabRow = {
  id?: string;
  name?: string;
  title?: string;
  grade?: string;
  estimatedValueUsd?: number;
  valueUsd?: number;
  priceUsd?: number;
  imageUrl?: string;
  image?: string;
  itemUrl?: string;
  url?: string;
};

function inferGrader(grade: string): UpsertExternalListingInput["grader"] {
  const upper = grade.toUpperCase();
  if (upper.includes("PSA")) return "PSA";
  if (upper.includes("BGS")) return "BGS";
  if (upper.includes("CGC")) return "CGC";
  if (upper.includes("SGC")) return "SGC";
  return null;
}

function apiRowToListing(
  row: ApiSlabRow,
  deepLinkUrl: string,
): UpsertExternalListingInput | null {
  const externalId = row.id?.trim();
  const title = (row.name ?? row.title)?.trim();
  const grade = row.grade?.trim();
  const imageUrl = (row.imageUrl ?? row.image)?.trim();
  if (!externalId || !title || !grade || !imageUrl) return null;

  const priceUsd =
    row.estimatedValueUsd ?? row.valueUsd ?? row.priceUsd ?? null;

  return {
    source: "collector_crypt",
    externalId,
    deepLinkUrl: row.itemUrl?.trim() || row.url?.trim() || deepLinkUrl,
    title,
    grade,
    grader: inferGrader(grade),
    priceUsd: priceUsd != null ? Math.round(priceUsd * 1.15 * 100) / 100 : null,
    priceSol: null,
    currency: "USD",
    imageUrl,
    cardName: title,
    fmvUsd: priceUsd,
    status: "active",
  };
}

async function fetchAccountApiListings(
  accountUrl: string,
): Promise<UpsertExternalListingInput[]> {
  const match = accountUrl.match(/account\/([a-zA-Z0-9]+)/);
  if (!match) return [];

  const accountId = match[1];
  const marketplaceUrl = "https://collectorcrypt.com/marketplace";
  const apiCandidates = [
    `https://api.collectorcrypt.com/accounts/${accountId}/slabs`,
    `https://api.collectorcrypt.com/v1/accounts/${accountId}/slabs`,
    `https://api.collectorcrypt.com/accounts/${accountId}/listings`,
    `https://api.collectorcrypt.com/v1/accounts/${accountId}/listings`,
  ];

  for (const apiUrl of apiCandidates) {
    try {
      const response = await fetch(apiUrl, {
        headers: { "User-Agent": SCRAPER_USER_AGENT },
        signal: AbortSignal.timeout(SCRAPER_TIMEOUT_MS),
      });
      if (!response.ok) continue;

      const contentLength = response.headers.get("content-length");
      if (
        contentLength &&
        Number.parseInt(contentLength, 10) > SCRAPER_MAX_RESPONSE_BYTES
      ) {
        continue;
      }

      const data = (await response.json()) as ApiSlabRow[] | { items?: ApiSlabRow[] };
      const rows = Array.isArray(data) ? data : data.items;
      if (!Array.isArray(rows) || rows.length === 0) continue;

      const listings = rows
        .map((row) => apiRowToListing(row, marketplaceUrl))
        .filter((row): row is UpsertExternalListingInput => row != null);

      if (listings.length > 0) return listings;
    } catch {
      // try next candidate
    }
  }

  return [];
}

type FetchCollectorCryptApiListingsFn = () => Promise<UpsertExternalListingInput[]>;

async function fetchCollectorCryptApiListingsLive(): Promise<
  UpsertExternalListingInput[]
> {
  const accounts = siteJson.collectorCryptAccounts ?? [];
  const listings: UpsertExternalListingInput[] = [];
  const seen = new Set<string>();

  for (const account of accounts) {
    const rows = await fetchAccountApiListings(account.url);
    for (const row of rows) {
      if (seen.has(row.externalId)) continue;
      seen.add(row.externalId);
      listings.push(row);
    }
  }

  return listings;
}

let fetchCollectorCryptApiListingsOverride: FetchCollectorCryptApiListingsFn | null =
  null;

export function __setCollectorCryptApiListingsForTests(
  replacement: FetchCollectorCryptApiListingsFn | null,
): void {
  fetchCollectorCryptApiListingsOverride = replacement;
}

/** Partner API read path for CC — empty when no stable marketplace API responds. */
export async function fetchCollectorCryptApiListings(): Promise<
  UpsertExternalListingInput[]
> {
  if (fetchCollectorCryptApiListingsOverride) {
    return fetchCollectorCryptApiListingsOverride();
  }
  return fetchCollectorCryptApiListingsLive();
}
