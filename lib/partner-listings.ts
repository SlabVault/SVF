/**
 * Partner marketplace ingest — primary read path for `/trade/c/*` partner collections.
 *
 * Read priority (request path — page loads / API routes):
 * 1. Postgres `ExternalListing` (from `npm run sync:discover` batch upsert)
 * 2. Partner API where available (CC API candidates; Phygitals stub — not live yet)
 * 3. Static JSON seed (`data/external-listings.json`) — dev/offline
 * 4. Live CC scrape — FALLBACK ONLY when `PARTNER_LIVE_SCRAPE_ENABLED=true`
 *    (or `?live=1`) AND DB/API/JSON miss or all rows are stale
 *
 * Batch sync (`sync:discover`) may scrape CC off the request path — that is OK.
 * Helius DAS + Tensor REST are optional enrichment merges, not primary ingest.
 *
 * @see docs/integrations/phygitals-collectorcrypt.md
 */

import externalListingsJson from "@/data/external-listings.json";
import siteJson from "@/data/site.json";
import {
  COLLECTOR_CRYPT_MARKETPLACE_API_AVAILABLE,
  fetchCollectorCryptApiListings,
} from "@/lib/collector-crypt-api-listings";
import { fetchCollectorCryptListings } from "@/lib/collector-crypt-live-listings";
import {
  buildExternalListingId,
  computeStaleAfter,
  isExternalListingStale,
  listExternalListings,
  normalizeExternalListingInput,
} from "@/lib/external-listings";
import { getDatabaseUrl } from "@/lib/db-connection";
import { withTimeoutFallback } from "@/lib/fetch-with-timeout";
import { searchDasCollectionAssets, type DasAssetListing } from "@/lib/helius-das";
import { isHeliusDasConfigured, isTensorReadConfigured } from "@/lib/integrations/tensor";
import {
  listListings,
  resolveTensorSlugForCollection,
} from "@/lib/onchain/clients/tensor-tcm";
import type { TensorMintListing } from "@/lib/onchain/tensor-api";
import type { TradeCollectionConfig, TradePartnerId } from "@/lib/onchain/collections";
import { getTradeCollectionBySlug } from "@/lib/onchain/collections";
import type { MarketplaceSlab } from "@/lib/marketplace-slabs";
import { extractCertNumber } from "@/lib/trade/extract-cert-number";
import {
  resolvePartnerDeepLink,
  slugToPartnerPlatform,
} from "@/lib/trade/partner-deep-link";
import type { PartnerPlatformParam } from "@/lib/trade/partner-deep-link";
import {
  computeTradeCollectionStats,
  ensureCollectionStatsRibbonFromListings,
  resolveTradeListingMint,
  type TradeCollectionStats,
  type TradeListing,
} from "@/lib/trade-listings";
import { PHYGITALS_LIVE_INGEST_AVAILABLE } from "@/lib/phygitals-listings";
import type {
  ExternalListingItem,
  ExternalListingSource,
} from "@/types/external-listing";

import { PARTNER_SOL_USD_ESTIMATE } from "@/lib/trade/partner-constants";

export { PARTNER_SOL_USD_ESTIMATE };

export const PARTNER_PLATFORM_SLUGS = {
  collector_crypt: "collector-crypt",
  phygitals: "phygitals",
} as const;

export type { PartnerPlatformParam } from "@/lib/trade/partner-deep-link";
export { resolvePartnerDeepLink, slugToPartnerPlatform } from "@/lib/trade/partner-deep-link";

const PARTNER_TO_SOURCE: Partial<
  Record<TradePartnerId, ExternalListingSource>
> = {
  collector_crypt: "collector_crypt",
  phygitals: "phygitals",
};

const PARTNER_DEEP_LINK: Record<ExternalListingSource, string> = {
  collector_crypt: "https://collectorcrypt.com/marketplace",
  phygitals: "https://phygitals.com/invite/slabvault",
  magic_eden: "https://magiceden.io/",
  manual: "https://slabvault.fi/trade",
};

export function partnerToExternalSource(
  partner: TradePartnerId,
): ExternalListingSource | null {
  return PARTNER_TO_SOURCE[partner] ?? null;
}

export function isPartnerIngestSupported(partner: TradePartnerId): boolean {
  return partnerToExternalSource(partner) != null;
}

/** API path param → external listing source (collector_crypt | phygitals). */
export function parsePartnerPlatformParam(
  raw: string | undefined,
): PartnerPlatformParam | null {
  if (raw === "collector_crypt" || raw === "collector-crypt") {
    return "collector_crypt";
  }
  if (raw === "phygitals") return "phygitals";
  return null;
}

export function partnerPlatformToSlug(platform: PartnerPlatformParam): string {
  return PARTNER_PLATFORM_SLUGS[platform];
}

/** Sync seed count for landing / ops diagnostics (JSON only — no DB round-trip). */
export function getPartnerListingSeedCount(partner: TradePartnerId): number {
  const source = partnerToExternalSource(partner);
  if (!source) return 0;

  const rows = externalListingsJson as ExternalListingItem[];
  return rows.filter((row) => row.source === source && row.status === "active")
    .length;
}

export type PartnerListingSourceId =
  | "external_db"
  | "partner_api"
  | "external_json"
  | "cc_scraper"
  | "helius_das"
  | "tensor_api";

export type PartnerListingSourceInfo = {
  id: PartnerListingSourceId;
  label: string;
  description: string;
  configured: boolean;
  platforms: PartnerPlatformParam[];
};

const PARTNER_LISTING_SOURCE_CATALOG: ReadonlyArray<
  Omit<PartnerListingSourceInfo, "configured">
> = [
  {
    id: "external_db",
    label: "Postgres ExternalListing",
    description:
      "Cached rows from sync:discover / POST /api/sync when DATABASE_URL is set.",
    platforms: ["collector_crypt", "phygitals"],
  },
  {
    id: "partner_api",
    label: "Partner marketplace API",
    description:
      "CC API candidates when keyed; Phygitals live API not available yet.",
    platforms: ["collector_crypt", "phygitals"],
  },
  {
    id: "external_json",
    label: "JSON seed",
    description:
      "data/external-listings.json fallback when DB is unset or unreachable.",
    platforms: ["collector_crypt", "phygitals"],
  },
  {
    id: "cc_scraper",
    label: "Collector Crypt live scrape",
    description:
      "Fallback only — ?live=1 or PARTNER_LIVE_SCRAPE_ENABLED when seed stale/empty.",
    platforms: ["collector_crypt"],
  },
  {
    id: "helius_das",
    label: "Helius DAS",
    description:
      "On-chain collection assets when collectionMint + HELIUS_API_KEY are set.",
    platforms: ["collector_crypt", "phygitals"],
  },
  {
    id: "tensor_api",
    label: "Tensor REST enrichment",
    description:
      "Seller wallet + listState merge when TENSOR_API_KEY and slug resolve.",
    platforms: ["collector_crypt", "phygitals"],
  },
];

/** Static catalog + env flags for BFF `sources[]` transparency. */
export function getPartnerListingSources(): PartnerListingSourceInfo[] {
  const configuredById: Record<PartnerListingSourceId, boolean> = {
    external_db: Boolean(getDatabaseUrl()),
    partner_api:
      COLLECTOR_CRYPT_MARKETPLACE_API_AVAILABLE || PHYGITALS_LIVE_INGEST_AVAILABLE,
    external_json: true,
    cc_scraper:
      process.env.PARTNER_LIVE_SCRAPE_ENABLED?.trim().toLowerCase() === "true",
    helius_das: isHeliusDasConfigured(),
    tensor_api: isTensorReadConfigured(),
  };

  return PARTNER_LISTING_SOURCE_CATALOG.map((row) => ({
    ...row,
    configured: configuredById[row.id],
  }));
}

function usdToSolEstimate(usd: number | null): number {
  if (usd == null || usd <= 0) return 0;
  return Math.round((usd / PARTNER_SOL_USD_ESTIMATE) * 1000) / 1000;
}

function resolveAskSol(listing: ExternalListingItem): number {
  if (listing.priceSol != null && listing.priceSol > 0) {
    return listing.priceSol;
  }
  if (listing.currency === "USD" && listing.priceUsd != null) {
    return usdToSolEstimate(listing.priceUsd);
  }
  return usdToSolEstimate(listing.priceUsd);
}

function defaultPartnerImage(slug: string): string {
  if (slug === "collector-crypt") return "/gacha/collector-crypt.svg";
  if (slug === "phygitals") return "/gacha/phygitals.svg";
  return "/gacha/collector-crypt.svg";
}

function traitValue(
  attributes: { trait_type: string; value: string }[],
  keys: string[],
): string | null {
  for (const key of keys) {
    const hit = attributes.find(
      (a) => a.trait_type.toLowerCase() === key.toLowerCase(),
    );
    if (hit?.value) return hit.value;
  }
  return null;
}

/** Canonical dedupe aliases — cert, mint, and source+externalId when needed. */
export function partnerListingDedupeKeys(
  listing: ExternalListingItem,
): string[] {
  const keys = new Set<string>();
  const cert = normalizeCertNumber(listing.certNumber);
  const externalId = listing.externalId?.trim() ?? "";

  if (cert) keys.add(`cert:${cert}`);

  if (externalId) {
    if (looksLikeSolanaMint(externalId)) {
      keys.add(`mint:${externalId}`);
    } else {
      const certFromExternalId = certFromPartnerExternalId(externalId);
      if (certFromExternalId) {
        keys.add(`cert:${certFromExternalId}`);
      } else {
        keys.add(`id:${listing.source}:${externalId}`);
      }
    }
  }

  if (keys.size === 0) {
    keys.add(`id:${listing.source}:${listing.id}`);
  }

  return [...keys];
}

function partnerListingRichnessScore(listing: ExternalListingItem): number {
  let score = 0;
  if (listing.sellerWallet?.trim()) score += 4;
  if (listing.listState?.trim()) score += 4;
  if (listing.priceSol != null && listing.priceSol > 0) score += 2;
  if (looksLikeSolanaMint(listing.externalId)) score += 1;
  if (normalizeCertNumber(listing.certNumber)) score += 1;
  return score;
}

function positivePartnerAskSol(listing: ExternalListingItem): number | null {
  const ask = resolveAskSol(listing);
  return ask > 0 ? ask : null;
}

function pickLowerAskPartnerRow(
  existing: ExternalListingItem,
  incoming: ExternalListingItem,
): ExternalListingItem {
  const existingAsk = positivePartnerAskSol(existing);
  const incomingAsk = positivePartnerAskSol(incoming);
  if (existingAsk == null) return incoming;
  if (incomingAsk == null) return existing;
  return incomingAsk < existingAsk ? incoming : existing;
}

/** Combine partner ingest rows — lowest ask wins; seller/listState and mint id survive cert-only seed rows. */
function mergePartnerListingFields(
  existing: ExternalListingItem,
  incoming: ExternalListingItem,
): ExternalListingItem {
  const preferred =
    partnerListingRichnessScore(incoming) >= partnerListingRichnessScore(existing)
      ? incoming
      : existing;
  const other = preferred === incoming ? existing : incoming;
  const priceRow = pickLowerAskPartnerRow(existing, incoming);

  const mintExternalId =
    [preferred, other, priceRow]
      .find((row) => looksLikeSolanaMint(row.externalId))
      ?.externalId.trim() ?? priceRow.externalId;

  return normalizeExternalListingInput({
    ...priceRow,
    externalId: mintExternalId,
    certNumber:
      preferred.certNumber ??
      other.certNumber ??
      certFromPartnerExternalId(other.externalId),
    sellerWallet:
      preferred.sellerWallet?.trim() || other.sellerWallet?.trim() || null,
    listState: preferred.listState?.trim() || other.listState?.trim() || null,
    priceUsd: priceRow.priceUsd ?? preferred.priceUsd ?? other.priceUsd,
    priceSol:
      priceRow.priceSol != null && priceRow.priceSol > 0
        ? priceRow.priceSol
        : preferred.priceSol != null && preferred.priceSol > 0
          ? preferred.priceSol
          : other.priceSol,
    currency: priceRow.currency ?? preferred.currency ?? other.currency,
    fmvUsd: preferred.fmvUsd ?? other.fmvUsd ?? priceRow.fmvUsd,
    imageUrl: preferred.imageUrl?.trim() ? preferred.imageUrl : other.imageUrl,
    deepLinkUrl: priceRow.deepLinkUrl?.trim()
      ? priceRow.deepLinkUrl
      : preferred.deepLinkUrl?.trim()
        ? preferred.deepLinkUrl
        : other.deepLinkUrl,
    setName: preferred.setName ?? other.setName,
    cardName: preferred.cardName ?? other.cardName,
  });
}

function resolvePartnerListingCert(
  row: ExternalListingItem,
): string | null {
  return (
    normalizeCertNumber(row.certNumber) ??
    certFromPartnerExternalId(row.externalId)
  );
}

function tradeListingRichnessScore(listing: TradeListing): number {
  let score = 0;
  if (listing.sellerWallet) score += 4;
  if (listing.listState) score += 4;
  if (listing.askSol > 0) score += 1;
  return score;
}

function positiveTradeAskSol(listing: TradeListing): number | null {
  return listing.askSol > 0 ? listing.askSol : null;
}

function pickLowerAskTradeRow(
  existing: TradeListing,
  incoming: TradeListing,
): TradeListing {
  const existingAsk = positiveTradeAskSol(existing);
  const incomingAsk = positiveTradeAskSol(incoming);
  if (existingAsk == null) return incoming;
  if (incomingAsk == null) return existing;
  return incomingAsk < existingAsk ? incoming : existing;
}

function sameTradeListingVenue(a: TradeListing, b: TradeListing): boolean {
  return a.partner === b.partner && a.collectionId === b.collectionId;
}

function mergeAlternateVenueAsks(
  existing: TradeListing,
  incoming: TradeListing,
  winner: TradeListing,
): TradeListing["alternateVenueAsks"] {
  const byPartner = new Map<
    TradePartnerId,
    NonNullable<TradeListing["alternateVenueAsks"]>[number]
  >();

  const addAlternate = (
    entry: NonNullable<TradeListing["alternateVenueAsks"]>[number],
  ) => {
    const prev = byPartner.get(entry.partner);
    if (!prev || entry.askSol < prev.askSol) {
      byPartner.set(entry.partner, entry);
    }
  };

  for (const listing of [existing, incoming]) {
    for (const alt of listing.alternateVenueAsks ?? []) {
      if (alt.askSol > 0) addAlternate(alt);
    }
  }

  const existingAsk = positiveTradeAskSol(existing);
  const incomingAsk = positiveTradeAskSol(incoming);
  if (
    existingAsk != null &&
    incomingAsk != null &&
    !sameTradeListingVenue(existing, incoming)
  ) {
    const loser = existingAsk <= incomingAsk ? incoming : existing;
    if (loser.partner && loser.askSol > 0) {
      addAlternate({
        partner: loser.partner,
        askSol: loser.askSol,
        collectionId: loser.collectionId,
      });
    }
  }

  if (winner.partner) {
    byPartner.delete(winner.partner);
  }

  const merged = [...byPartner.values()];
  return merged.length > 0 ? merged : undefined;
}

function mergeTradeListingFields(
  existing: TradeListing,
  incoming: TradeListing,
): TradeListing {
  const richer =
    tradeListingRichnessScore(incoming) >= tradeListingRichnessScore(existing)
      ? incoming
      : existing;
  const other = richer === incoming ? existing : incoming;
  const priceRow = pickLowerAskTradeRow(existing, incoming);

  const mintId =
    [richer, other, priceRow]
      .find((row) => looksLikeSolanaMint(row.id))
      ?.id.trim() ?? priceRow.id;

  const existingAsk = positiveTradeAskSol(existing);
  const incomingAsk = positiveTradeAskSol(incoming);
  const bestAsk =
    existingAsk == null && incomingAsk == null
      ? 0
      : existingAsk == null
        ? incomingAsk!
        : incomingAsk == null
          ? existingAsk
          : Math.min(existingAsk, incomingAsk);

  const winnerCollection = getTradeCollectionBySlug(priceRow.collectionId);

  return {
    ...priceRow,
    id: mintId,
    partner: priceRow.partner ?? winnerCollection?.partner,
    collectionId: priceRow.collectionId,
    chain: priceRow.chain ?? winnerCollection?.chain ?? "solana",
    settlementMode:
      priceRow.settlementMode ?? winnerCollection?.settlementMode ?? "partner_site",
    vaultedUrl: priceRow.vaultedUrl,
    sellerWallet: richer.sellerWallet || other.sellerWallet,
    listState: richer.listState || other.listState,
    askSol: bestAsk,
    alternateVenueAsks: mergeAlternateVenueAsks(existing, incoming, priceRow),
  };
}

/** Cert, mint, and desk id aliases — keeps one tile with richest on-chain metadata. */
export function partnerTradeListingDedupeKeys(listing: TradeListing): string[] {
  const keys = new Set<string>();
  keys.add(`id:${listing.id}`);

  const cert = extractCertNumber(listing);
  if (cert) keys.add(`cert:${cert}`);

  const certFromId = normalizeCertNumber(listing.id);
  if (certFromId) keys.add(`cert:${certFromId}`);

  if (looksLikeSolanaMint(listing.id)) {
    keys.add(`mint:${listing.id.trim()}`);
  }

  const mint = resolveTradeListingMint(listing);
  if (mint) keys.add(`mint:${mint}`);

  return [...keys];
}

export function dedupePartnerTradeListings(listings: TradeListing[]): TradeListing[] {
  const aliasToCanonical = new Map<string, string>();
  const merged = new Map<string, TradeListing>();

  const resolveCanonical = (keys: string[]): string => {
    for (const key of keys) {
      const canonical = aliasToCanonical.get(key);
      if (canonical) return canonical;
    }
    return keys[0]!;
  };

  for (const row of listings) {
    const keys = partnerTradeListingDedupeKeys(row);
    const canonical = resolveCanonical(keys);
    const existing = merged.get(canonical);
    merged.set(
      canonical,
      existing ? mergeTradeListingFields(existing, row) : row,
    );
    for (const key of keys) {
      aliasToCanonical.set(key, canonical);
    }
  }

  return [...merged.values()];
}

const CERT_TRAIT_KEYS = [
  "cert",
  "cert number",
  "cert #",
  "certification",
] as const;

function normalizeCertNumber(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 6 ? digits : null;
}

/** Cert digits carried in partner externalId (not UUIDs, slugs, or mints). */
function certFromPartnerExternalId(externalId: string): string | null {
  const trimmed = externalId.trim();
  if (!trimmed || looksLikeSolanaMint(trimmed)) return null;
  if (!/^[\d\s-]+$/.test(trimmed)) return null;
  return normalizeCertNumber(trimmed);
}

/** Base58 mint — excludes UUID-style partner externalIds. */
export function looksLikeSolanaMint(value: string | null | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length < 32 || trimmed.length > 44) return false;
  if (trimmed.includes("-")) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(trimmed);
}

function tensorCertFromListing(listing: TensorMintListing): string | null {
  for (const key of CERT_TRAIT_KEYS) {
    const hit = listing.attributes.find(
      (a) => a.trait_type.toLowerCase() === key,
    );
    if (hit?.value) return normalizeCertNumber(hit.value);
  }
  return null;
}

export type PartnerTensorEnrichmentStats = {
  tensorSlug: string;
  tensorRows: number;
  partnerRows: number;
  matchedByMint: number;
  matchedByCert: number;
  enrichedSeller: number;
  /** Rows with sellerWallet or listState after merge. */
  withSellerMetadata: number;
};

function buildTensorListingIndexes(listings: TensorMintListing[]): {
  byMint: Map<string, TensorMintListing>;
  byCert: Map<string, TensorMintListing>;
} {
  const byMint = new Map<string, TensorMintListing>();
  const byCert = new Map<string, TensorMintListing>();

  for (const row of listings) {
    const mint = row.mint.trim();
    if (mint) byMint.set(mint, row);

    const cert = tensorCertFromListing(row);
    if (cert && !byCert.has(cert)) {
      byCert.set(cert, row);
    }
  }

  return { byMint, byCert };
}

/**
 * Merge Tensor mint/list rows onto partner listings by mint or cert — populates
 * sellerWallet + listState so on-chain buy works without modal fallback.
 */
export function mergePartnerListingsWithTensorMetadata(
  partnerRows: ExternalListingItem[],
  tensorRows: TensorMintListing[],
): { rows: ExternalListingItem[]; stats: Omit<PartnerTensorEnrichmentStats, "tensorSlug"> } {
  const { byMint, byCert } = buildTensorListingIndexes(tensorRows);
  let matchedByMint = 0;
  let matchedByCert = 0;
  let enrichedSeller = 0;
  let withSellerMetadata = 0;

  const rows = partnerRows.map((row) => {
    let tensorHit: TensorMintListing | undefined;

    if (looksLikeSolanaMint(row.externalId)) {
      tensorHit = byMint.get(row.externalId.trim());
      if (tensorHit) matchedByMint += 1;
    }

    if (!tensorHit) {
      const cert = resolvePartnerListingCert(row);
      if (cert) {
        tensorHit = byCert.get(cert);
        if (tensorHit) matchedByCert += 1;
      }
    }

    if (!tensorHit) return row;

    const sellerWallet =
      tensorHit.sellerWallet?.trim() || row.sellerWallet?.trim() || null;
    const listState = tensorHit.listState?.trim() || row.listState?.trim() || null;
    const externalId = looksLikeSolanaMint(tensorHit.mint)
      ? tensorHit.mint.trim()
      : row.externalId;
    const cert = resolvePartnerListingCert(row);

    if (sellerWallet || listState) {
      enrichedSeller += 1;
    }

    const merged = normalizeExternalListingInput({
      ...row,
      externalId,
      certNumber: row.certNumber ?? cert ?? null,
      sellerWallet,
      listState,
    });

    if (merged.sellerWallet || merged.listState) {
      withSellerMetadata += 1;
    }

    return merged;
  });

  return {
    rows,
    stats: {
      tensorRows: tensorRows.length,
      partnerRows: partnerRows.length,
      matchedByMint,
      matchedByCert,
      enrichedSeller,
      withSellerMetadata,
    },
  };
}

async function enrichPartnerListingsWithTensor(
  rows: ExternalListingItem[],
  collection: TradeCollectionConfig,
): Promise<{
  rows: ExternalListingItem[];
  enrichment: PartnerTensorEnrichmentStats | null;
}> {
  const tensorSlug = resolveTensorSlugForCollection(collection.slug);
  if (!tensorSlug || !isTensorReadConfigured()) {
    return { rows, enrichment: null };
  }

  try {
    const result = await withTimeoutFallback(
      listListings(collection.slug, {
        limit: 200,
        collectionMint: collection.collectionMint,
      }),
      { source: "unconfigured" as const, page: { listings: [], cursor: null } },
      12_000,
      "Partner Tensor seller enrichment",
    );
    const { rows: merged, stats } = mergePartnerListingsWithTensorMetadata(
      rows,
      result.page.listings,
    );
    return {
      rows: merged,
      enrichment: { tensorSlug, ...stats },
    };
  } catch (error) {
    console.error("Partner Tensor seller enrichment failed:", error);
    return { rows, enrichment: null };
  }
}

/** Merge partner ingest rows; cert/mint aliases unify CC + Phygitals; lowest ask wins. */
export function mergePartnerExternalListings(
  primary: ExternalListingItem[],
  supplemental: ExternalListingItem[],
): ExternalListingItem[] {
  const aliasToCanonical = new Map<string, string>();
  const merged = new Map<string, ExternalListingItem>();

  const resolveCanonical = (keys: string[]): string => {
    for (const key of keys) {
      const canonical = aliasToCanonical.get(key);
      if (canonical) return canonical;
    }
    return keys[0]!;
  };

  for (const row of [...primary, ...supplemental]) {
    const keys = partnerListingDedupeKeys(row);
    const canonical = resolveCanonical(keys);
    const existing = merged.get(canonical);
    merged.set(
      canonical,
      existing ? mergePartnerListingFields(existing, row) : row,
    );
    for (const key of keys) {
      aliasToCanonical.set(key, canonical);
    }
  }

  return [...merged.values()];
}

function dasAssetToExternalListing(
  asset: DasAssetListing,
  source: ExternalListingSource,
  collectionSlug: string,
): ExternalListingItem | null {
  const cert =
    traitValue(asset.attributes, [
      "cert",
      "cert number",
      "cert #",
      "certification",
    ]) ?? null;
  const grade =
    traitValue(asset.attributes, [
      "grade",
      "grader",
      "psa grade",
      "bgs grade",
    ]) ?? "Graded";
  const externalId = asset.mint ?? asset.id;
  const indexedAt = new Date().toISOString();
  const deepLinkUrl = asset.mint
    ? `https://solscan.io/token/${asset.mint}`
    : PARTNER_DEEP_LINK[source];

  return normalizeExternalListingInput({
    source,
    externalId,
    deepLinkUrl,
    title: asset.name,
    grade,
    certNumber: cert,
    priceUsd: null,
    priceSol: asset.priceLamports
      ? asset.priceLamports / 1_000_000_000
      : null,
    currency: asset.priceLamports ? "SOL" : "USD",
    imageUrl: asset.imageUri ?? defaultPartnerImage(collectionSlug),
    status: "active",
    indexedAt,
    staleAfter: computeStaleAfter(new Date(indexedAt)),
    sellerWallet: asset.ownerWallet,
    listState: null,
  });
}

async function fetchDasPartnerListings(
  collection: TradeCollectionConfig,
  source: ExternalListingSource,
): Promise<ExternalListingItem[]> {
  if (!collection.collectionMint || !isHeliusDasConfigured()) {
    return [];
  }

  try {
    const assets = await searchDasCollectionAssets(collection.collectionMint, 48);
    return assets
      .map((asset) => dasAssetToExternalListing(asset, source, collection.slug))
      .filter((row): row is ExternalListingItem => row != null);
  } catch (error) {
    console.error("Partner DAS enrichment failed:", error);
    return [];
  }
}

async function fetchPartnerApiRows(
  platform: PartnerPlatformParam,
): Promise<ExternalListingItem[]> {
  if (platform !== "collector_crypt") return [];

  try {
    const inputs = await fetchCollectorCryptApiListings();
    if (inputs.length === 0) return [];

    const indexedAt = new Date().toISOString();
    const staleAfter = computeStaleAfter(new Date(indexedAt));
    return inputs.map((input) =>
      normalizeExternalListingInput({
        ...input,
        id: buildExternalListingId(input.source, input.externalId),
        indexedAt,
        staleAfter,
      }),
    );
  } catch (error) {
    console.error("Collector Crypt partner API fetch failed:", error);
    return [];
  }
}

function partnerIngestNeedsRefresh(rows: ExternalListingItem[]): boolean {
  if (rows.length === 0) return true;
  return rows.every((row) => isExternalListingStale(row));
}

/** Live scrape is fallback-only — never default on SSR/API unless stale/empty or ?live=1. */
export function shouldUseLiveScrapeFallback(
  platform: PartnerPlatformParam,
  rows: ExternalListingItem[],
  options?: { includeLiveScrape?: boolean },
): boolean {
  if (platform !== "collector_crypt") return false;
  if (process.env.NODE_ENV === "test") return false;

  const explicitlyRequested = options?.includeLiveScrape === true;
  const envEnabled =
    process.env.PARTNER_LIVE_SCRAPE_ENABLED?.trim().toLowerCase() === "true";

  if (explicitlyRequested) return true;
  if (!envEnabled) return false;

  return partnerIngestNeedsRefresh(rows);
}

async function fetchLiveCollectorCryptRows(): Promise<ExternalListingItem[]> {
  try {
    const inputs = await fetchCollectorCryptListings();
    const indexedAt = new Date().toISOString();
    const staleAfter = computeStaleAfter(new Date(indexedAt));
    return inputs.map((input) =>
      normalizeExternalListingInput({
        ...input,
        id: buildExternalListingId(input.source, input.externalId),
        indexedAt,
        staleAfter,
      }),
    );
  } catch (error) {
    console.error("Live Collector Crypt scrape failed:", error);
    return [];
  }
}

export function mapPartnerListingToTradeListing(
  listing: ExternalListingItem,
  collectionSlug: string,
): TradeListing {
  const askSol = resolveAskSol(listing);
  const cert = listing.certNumber?.trim();
  const name = cert ? `${listing.title} #${cert}` : listing.title;
  const id = looksLikeSolanaMint(listing.externalId)
    ? listing.externalId.trim()
    : cert ?? listing.externalId;

  const slab: MarketplaceSlab = {
    id,
    name,
    grade: listing.grade,
    estimatedValueUsd: listing.fmvUsd ?? listing.priceUsd,
    acquiredAt: listing.indexedAt,
    imageUrl: listing.imageUrl || defaultPartnerImage(collectionSlug),
    vaultedUrl: listing.deepLinkUrl,
    collectrUrl: null,
    status: "AVAILABLE",
    solPrice: askSol,
    svfPrice: 0,
  };

  const sellerWallet = listing.sellerWallet?.trim();
  const listState = listing.listState?.trim();

  const partial: TradeListing = {
    ...slab,
    askSol,
    collectionId: collectionSlug,
    setName: listing.setName ?? null,
    partner: getTradeCollectionBySlug(collectionSlug)?.partner,
    chain: getTradeCollectionBySlug(collectionSlug)?.chain ?? "solana",
    settlementMode: getTradeCollectionBySlug(collectionSlug)?.settlementMode ?? "partner_site",
    sellerWallet: sellerWallet || undefined,
    listState: listState || undefined,
  };

  const platform = slugToPartnerPlatform(collectionSlug);
  if (platform) {
    return {
      ...partial,
      vaultedUrl: resolvePartnerDeepLink(partial, platform),
    };
  }

  return partial;
}

export type PartnerTradeListingsResult = {
  platform: PartnerPlatformParam;
  slug: string;
  listings: TradeListing[];
  stats: TradeCollectionStats;
  fromFallback: boolean;
  dbStatus: "unconfigured" | "connected" | "unreachable";
  sources: PartnerListingSourceId[];
  /** Tensor seller/listState merge stats when TENSOR_API_KEY + slug are set. */
  tensorEnrichment?: PartnerTensorEnrichmentStats | null;
};

async function aggregatePartnerExternalListings(
  collection: TradeCollectionConfig,
  platform: PartnerPlatformParam,
  options?: { includeLiveScrape?: boolean },
): Promise<{
  listings: ExternalListingItem[];
  fromFallback: boolean;
  dbStatus: PartnerTradeListingsResult["dbStatus"];
  sources: PartnerTradeListingsResult["sources"];
}> {
  const external = await listExternalListings({ platform });
  const sources: PartnerTradeListingsResult["sources"] = external.fromFallback
    ? ["external_json"]
    : ["external_db"];

  let rows = external.listings;

  if (partnerIngestNeedsRefresh(rows)) {
    const apiRows = await fetchPartnerApiRows(platform);
    if (apiRows.length > 0) {
      rows = mergePartnerExternalListings(rows, apiRows);
      sources.push("partner_api");
    }
  }

  if (shouldUseLiveScrapeFallback(platform, rows, options)) {
    const scraped = await fetchLiveCollectorCryptRows();
    if (scraped.length > 0) {
      rows = mergePartnerExternalListings(rows, scraped);
      sources.push("cc_scraper");
    }
  }

  const listingSource = partnerToExternalSource(platform);
  const dasRows =
    listingSource != null
      ? await fetchDasPartnerListings(collection, listingSource)
      : [];
  if (dasRows.length > 0) {
    rows = mergePartnerExternalListings(rows, dasRows);
    sources.push("helius_das");
  }

  return {
    listings: rows,
    fromFallback: external.fromFallback,
    dbStatus: external.dbStatus,
    sources,
  };
}

/** Load partner listings for a trade collection slug (CC, Phygitals). */
export async function listPartnerTradeListings(
  collection: TradeCollectionConfig,
  options?: { includeLiveScrape?: boolean },
): Promise<PartnerTradeListingsResult> {
  const platform = slugToPartnerPlatform(collection.slug);
  const source = partnerToExternalSource(collection.partner);

  if (!platform || !source) {
    return {
      platform: "collector_crypt",
      slug: collection.slug,
      listings: [],
      stats: {
        listedCount: 0,
        floorSol: null,
        topAskSol: null,
        totalFmvUsd: null,
      },
      fromFallback: false,
      dbStatus: "unconfigured",
      sources: [],
    };
  }

  const ingestOptions =
    platform === "phygitals"
      ? { includeLiveScrape: resolvePhygitalsIncludeLiveScrape(options) }
      : options;

  const aggregated = await aggregatePartnerExternalListings(
    collection,
    platform,
    ingestOptions,
  );

  const enriched = await enrichPartnerListingsWithTensor(
    aggregated.listings,
    collection,
  );
  const sources = [...aggregated.sources];
  if (enriched.enrichment != null) {
    sources.push("tensor_api");
  }

  const tradeListings = dedupePartnerTradeListings(
    enriched.rows.map((row) =>
      mapPartnerListingToTradeListing(row, collection.slug),
    ),
  );

  const stats = ensureCollectionStatsRibbonFromListings(
    computeTradeCollectionStats(tradeListings),
    tradeListings,
  );

  return {
    platform,
    slug: collection.slug,
    listings: tradeListings,
    stats,
    fromFallback: aggregated.fromFallback,
    dbStatus: aggregated.dbStatus,
    sources,
    tensorEnrichment: enriched.enrichment,
  };
}

/** BFF handler input — platform param from `/api/trade/partners/[platform]/listings`. */
export async function getPartnerListingsForPlatform(
  platformParam: string,
  options?: { includeLiveScrape?: boolean },
): Promise<PartnerTradeListingsResult | null> {
  const platform = parsePartnerPlatformParam(platformParam);
  if (!platform) return null;

  const slug = partnerPlatformToSlug(platform);
  const collection = getTradeCollectionBySlug(slug);
  if (!collection) return null;

  return listPartnerTradeListings(collection, options);
}

export type PartnerTradeStatsResult = {
  platform: PartnerPlatformParam;
  slug: string;
  stats: TradeCollectionStats;
  fromFallback: boolean;
  dbStatus: PartnerTradeListingsResult["dbStatus"];
  sources: PartnerTradeListingsResult["sources"];
  readConfigured: boolean;
};

/** Floor + count only — `/api/trade/partners/[platform]/stats`. */
export async function getPartnerStatsForPlatform(
  platformParam: string,
  options?: { includeLiveScrape?: boolean },
): Promise<PartnerTradeStatsResult | null> {
  const result = await getPartnerListingsForPlatform(platformParam, options);
  if (!result) return null;

  return {
    platform: result.platform,
    slug: result.slug,
    stats: result.stats,
    fromFallback: result.fromFallback,
    dbStatus: result.dbStatus,
    sources: result.sources,
    readConfigured: result.stats.listedCount > 0,
  };
}

/** Treasury CC account URLs for ops / diagnostics. */
export function getCollectorCryptAccountUrls(): string[] {
  return (siteJson.collectorCryptAccounts ?? []).map((row) => row.url);
}

/** Phygitals ingest never enables live API/scrape until partner API exists. */
export function resolvePhygitalsIncludeLiveScrape(
  options?: { includeLiveScrape?: boolean },
): boolean {
  if (!PHYGITALS_LIVE_INGEST_AVAILABLE) return false;
  return options?.includeLiveScrape === true;
}

const EMPTY_PARTNER_STATS: TradeCollectionStats = {
  listedCount: 0,
  floorSol: null,
  topAskSol: null,
  totalFmvUsd: null,
  volume24hSol: null,
  volumeAllSol: null,
  sales24h: null,
  priceChange24hPct: null,
};

/** Phygitals desk ingest — JSON/DB seed only (`PHYGITALS_LIVE_INGEST_AVAILABLE=false`). */
export async function fetchPhygitalsPartnerIngest(
  options?: { includeLiveScrape?: boolean },
): Promise<PartnerTradeListingsResult> {
  const collection = getTradeCollectionBySlug("phygitals");
  if (!collection) {
    return {
      platform: "phygitals",
      slug: "phygitals",
      listings: [],
      stats: EMPTY_PARTNER_STATS,
      fromFallback: false,
      dbStatus: "unconfigured",
      sources: [],
    };
  }

  return listPartnerTradeListings(collection, {
    includeLiveScrape: resolvePhygitalsIncludeLiveScrape(options),
  });
}
