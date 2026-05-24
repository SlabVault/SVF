/**
 * Live Collector Crypt scrape — no Node fs; safe to import from server routes
 * and partner ingest (avoid pulling `external-listings-sync` into client bundles).
 */

import siteJson from "@/data/site.json";
import {
  __setCollectorCryptApiListingsForTests,
  fetchCollectorCryptApiListings,
} from "@/lib/collector-crypt-api-listings";

export { __setCollectorCryptApiListingsForTests };
import type { UpsertExternalListingInput } from "@/lib/external-listings";
import * as collectorCryptScraper from "@/lib/scrapers/collector-crypt-scraper";
import { SCRAPER_TIMEOUT_MS } from "@/lib/scrapers/scraper-utils";

export type CollectorCryptIngestSource = "api" | "scrape" | "none";

type ScrapeCollectorCryptSlabs = typeof collectorCryptScraper.scrapeCollectorCryptSlabs;

let scrapeCollectorCryptSlabsImpl: ScrapeCollectorCryptSlabs =
  collectorCryptScraper.scrapeCollectorCryptSlabs.bind(collectorCryptScraper);

export function __setCollectorCryptScrapeForTests(
  replacement: ScrapeCollectorCryptSlabs | null,
): void {
  scrapeCollectorCryptSlabsImpl = replacement
    ? replacement
    : collectorCryptScraper.scrapeCollectorCryptSlabs.bind(collectorCryptScraper);
}

/** HTTP timeout plus parsing headroom for multi-account discover sync. */
const ACCOUNT_SCRAPE_TIMEOUT_MS = SCRAPER_TIMEOUT_MS + 5_000;

function inferGrader(grade: string): UpsertExternalListingInput["grader"] {
  const upper = grade.toUpperCase();
  if (upper.includes("PSA")) return "PSA";
  if (upper.includes("BGS")) return "BGS";
  if (upper.includes("CGC")) return "CGC";
  if (upper.includes("SGC")) return "SGC";
  return null;
}

function ccSlabToListing(
  slab: {
    id: string;
    name: string;
    grade: string;
    estimatedValueUsd: number | null;
    imageUrl: string;
    profileUrl: string;
    itemUrl: string;
  },
  deepLinkUrl: string,
): UpsertExternalListingInput {
  const priceUsd = slab.estimatedValueUsd;
  return {
    source: "collector_crypt",
    externalId: slab.id,
    deepLinkUrl,
    title: slab.name,
    grade: slab.grade,
    grader: inferGrader(slab.grade),
    priceUsd: priceUsd != null ? Math.round(priceUsd * 1.15 * 100) / 100 : null,
    priceSol: null,
    currency: "USD",
    imageUrl: slab.imageUrl,
    cardName: slab.name,
    fmvUsd: priceUsd,
    status: "active",
  };
}

function scrapeErrorMessage(error: unknown, accountUrl: string): string {
  if (error instanceof Error) {
    return `Collector Crypt scrape failed for ${accountUrl}: ${error.message}`;
  }
  return `Collector Crypt scrape failed for ${accountUrl}.`;
}

async function scrapeAccountSlabs(
  accountUrl: string,
): Promise<
  Awaited<ReturnType<typeof collectorCryptScraper.scrapeCollectorCryptSlabs>>
> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(
          `Collector Crypt scrape timed out after ${ACCOUNT_SCRAPE_TIMEOUT_MS}ms`,
        ),
      );
    }, ACCOUNT_SCRAPE_TIMEOUT_MS);
  });

  try {
    return await Promise.race([
      scrapeCollectorCryptSlabsImpl(accountUrl),
      timeout,
    ]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * CC batch ingest — API candidates first, HTML scrape fallback.
 * Used by `npm run sync:discover` and off-path refresh jobs.
 */
export async function fetchCollectorCryptIngestListings(): Promise<{
  listings: UpsertExternalListingInput[];
  source: CollectorCryptIngestSource;
}> {
  try {
    const apiListings = await fetchCollectorCryptApiListings();
    if (apiListings.length > 0) {
      return { listings: apiListings, source: "api" };
    }
  } catch (error) {
    console.error("Collector Crypt API ingest failed:", error);
  }

  const scraped = await fetchCollectorCryptListings();
  return {
    listings: scraped,
    source: scraped.length > 0 ? "scrape" : "none",
  };
}

/** Live CC account scrape — fallback when API candidates return no rows. */
export async function fetchCollectorCryptListings(): Promise<
  UpsertExternalListingInput[]
> {
  const accounts = siteJson.collectorCryptAccounts ?? [];
  const marketplaceUrl = "https://collectorcrypt.com/marketplace";
  const listings: UpsertExternalListingInput[] = [];
  const seen = new Set<string>();

  for (const account of accounts) {
    let slabs: Awaited<
      ReturnType<typeof collectorCryptScraper.scrapeCollectorCryptSlabs>
    > = null;
    try {
      slabs = await scrapeAccountSlabs(account.url);
    } catch (error) {
      console.error(scrapeErrorMessage(error, account.url));
      continue;
    }

    if (!slabs?.length) continue;

    for (const slab of slabs) {
      if (seen.has(slab.id)) continue;
      seen.add(slab.id);
      listings.push(
        ccSlabToListing(
          slab,
          slab.itemUrl.includes("collectorcrypt.com")
            ? slab.itemUrl
            : marketplaceUrl,
        ),
      );
    }
  }

  return listings;
}
