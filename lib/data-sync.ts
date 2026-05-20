import { getWalletData } from "./solana-wallet";
import {
  fetchCollectorCryptData,
  fetchCollectorCryptSlabs,
} from "./scrapers/collector-crypt-scraper";
import { scrapeCollectrShowcase } from "./scrapers/collectr-scraper";
import {
  fetchVollectorData,
  type VollectorSlab,
} from "./scrapers/vollector-scraper";
import { fetchVaultedData } from "./scrapers/vaulted-scraper";
import type { SlabItem, PullItem } from "@/types/content";
import type { CollectorCryptPull } from "@/lib/scrapers/collector-crypt-scraper";
import siteJson from "@/data/site.json";
import slabsJson from "@/data/slabs.json";
import pullsJson from "@/data/pulls.json";
import { writeFile } from "fs/promises";
import { join } from "path";

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

export type SyncResult = {
  success: boolean;
  timestamp: string;
  slabsUpdated: boolean;
  pullsUpdated: boolean;
  walletDataUpdated: boolean;
  slabSource: string | null;
  errors: string[];
};

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
  source: string;
} | null> {
  console.log("Trying Collector Crypt treasury accounts...");
  const ccSlabs = await fetchCollectorCryptSlabs([
    COLLECTOR_CRYPT_TREASURY_URL,
    COLLECTOR_CRYPT_DEPLOYER_URL,
  ]);
  if (ccSlabs?.length) {
    return { slabs: ccSlabs.map(toSlabItem), source: "collector-crypt" };
  }

  console.log("Collector Crypt empty, trying Vollector...");
  const vollectorSlabs = await fetchVollectorData(VOLLECTOR_PROFILE_URL);
  if (vollectorSlabs?.length) {
    return { slabs: vollectorSlabs.map(toSlabItem), source: "vollector" };
  }

  console.log("Vollector empty, trying Vaulted...");
  const vaultedSlabs = await fetchVaultedData(VAULTED_PROFILE_URL);
  if (vaultedSlabs?.length) {
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
    };
  }

  console.log("Vaulted empty, trying Collectr...");
  const collectrSlabs = await scrapeCollectrShowcase(COLLECTR_SHOWCASE_URL);
  if (collectrSlabs?.length) {
    return { slabs: collectrSlabs.map(toSlabItem), source: "collectr" };
  }

  return null;
}

/**
 * Main data sync function - fetches data from all sources and updates JSON files.
 */
export async function syncAllData(): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    timestamp: new Date().toISOString(),
    slabsUpdated: false,
    pullsUpdated: false,
    walletDataUpdated: false,
    slabSource: null,
    errors: [],
  };

  try {
    console.log("Starting data sync at:", result.timestamp);

    const slabsResult = await syncSlabs();
    result.slabsUpdated = slabsResult.updated;
    result.slabSource = slabsResult.source;
    if (!slabsResult.updated) {
      result.errors.push(
        slabsResult.source
          ? "Slab sync returned no changes"
          : "Failed to sync slabs from all sources (keeping existing data)",
      );
    }

    const pullsResult = await syncPulls();
    result.pullsUpdated = pullsResult;
    if (!pullsResult) {
      result.errors.push(
        "Failed to sync pulls from Collector Crypt (keeping existing data)",
      );
    }

    const walletResult = await syncWalletData();
    result.walletDataUpdated = walletResult;
    if (!walletResult) {
      result.errors.push("Failed to sync wallet data");
    }

    result.success =
      result.slabsUpdated || result.pullsUpdated || result.walletDataUpdated;
    console.log("Data sync completed:", result);

    return result;
  } catch (error) {
    console.error("Error during data sync:", error);
    result.errors.push(error instanceof Error ? error.message : "Unknown error");
    return result;
  }
}

async function syncSlabs(): Promise<{ updated: boolean; source: string | null }> {
  try {
    const fetched = await fetchSlabsWithFallback();
    if (!fetched?.slabs.length) {
      console.log("No slab data found from any source, keeping existing data");
      return { updated: false, source: null };
    }

    const slabsPath = join(process.cwd(), "data", "slabs.json");
    await writeFile(slabsPath, JSON.stringify(fetched.slabs, null, 2), "utf-8");

    console.log(`Updated ${fetched.slabs.length} slabs from ${fetched.source}`);
    return { updated: true, source: fetched.source };
  } catch (error) {
    console.error("Error syncing slabs:", error);
    return { updated: false, source: null };
  }
}

async function syncPulls(): Promise<boolean> {
  try {
    console.log("Syncing pulls from Collector Crypt...");

    let collectorPulls: CollectorCryptPull[] | null =
      await fetchCollectorCryptData(COLLECTOR_CRYPT_TREASURY_URL);

    if (!collectorPulls?.length) {
      collectorPulls = await fetchCollectorCryptData(COLLECTOR_CRYPT_DEPLOYER_URL);
    }

    if (!collectorPulls?.length) {
      console.log("No pull data found from Collector Crypt, keeping existing data");
      return false;
    }

    const pulls: PullItem[] = collectorPulls.map((pull) => ({
      id: pull.id,
      date: pull.date,
      source: pull.source,
      summary: pull.summary,
      costUsd: pull.costUsd,
      outcomeUsd: pull.outcomeUsd,
      clipUrl: pull.clipUrl,
    }));

    const pullsPath = join(process.cwd(), "data", "pulls.json");
    await writeFile(pullsPath, JSON.stringify(pulls, null, 2), "utf-8");

    console.log(`Updated ${pulls.length} pulls`);
    return true;
  } catch (error) {
    console.error("Error syncing pulls:", error);
    return false;
  }
}

async function syncWalletData(): Promise<boolean> {
  try {
    console.log("Syncing wallet data from Solana...");

    const treasuryData = await getWalletData(TREASURY_WALLET);
    if (!treasuryData) {
      console.log("Failed to fetch treasury wallet data");
      return false;
    }

    const deployerData = await getWalletData(DEPLOYER_WALLET);
    if (!deployerData) {
      console.log("Failed to fetch deployer wallet data");
      return false;
    }

    const updatedSite = {
      ...siteJson,
      treasuryBalanceSol: treasuryData.balanceSol,
      deployerBalanceSol: deployerData.balanceSol,
      lastWalletSync: new Date().toISOString(),
    };

    const sitePath = join(process.cwd(), "data", "site.json");
    await writeFile(sitePath, JSON.stringify(updatedSite, null, 2), "utf-8");

    console.log(
      `Updated wallet balances: Treasury=${treasuryData.balanceSol} SOL, Deployer=${deployerData.balanceSol} SOL`,
    );
    return true;
  } catch (error) {
    console.error("Error syncing wallet data:", error);
    return false;
  }
}

export async function manualSync(): Promise<SyncResult> {
  console.log("Running manual data sync...");
  return syncAllData();
}

export async function getSyncStatus(): Promise<{
  lastSync: string | null;
  slabCount: number;
  pullCount: number;
}> {
  return {
    lastSync: siteJson.lastWalletSync || null,
    slabCount: slabsJson.length,
    pullCount: pullsJson.length,
  };
}
