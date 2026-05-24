import assert from "node:assert/strict";
import { test } from "node:test";

import { getTradeCollectionBySlug } from "@/lib/onchain/collections";
import { resolveTradeListingMint } from "@/lib/trade-listings";
import { withTemporaryEnv } from "./helpers/test-helpers";
import {
  getPartnerListingSeedCount,
  getPartnerListingSources,
  getPartnerStatsForPlatform,
  isPartnerIngestSupported,
  listPartnerTradeListings,
  looksLikeSolanaMint,
  mapPartnerListingToTradeListing,
  mergePartnerExternalListings,
  mergePartnerListingsWithTensorMetadata,
  dedupePartnerTradeListings,
  parsePartnerPlatformParam,
  partnerListingDedupeKeys,
  PARTNER_SOL_USD_ESTIMATE,
  partnerPlatformToSlug,
  slugToPartnerPlatform,
  resolvePartnerDeepLink,
} from "@/lib/partner-listings";
import type { ExternalListingItem } from "@/types/external-listing";

const sampleListing: ExternalListingItem = {
  id: "cc-test-001",
  source: "collector_crypt",
  externalId: "test-001",
  deepLinkUrl: "https://collectorcrypt.com/marketplace",
  title: "Charizard ex",
  grade: "PSA 10",
  grader: "PSA",
  certNumber: "1234567890",
  priceUsd: 150,
  priceSol: null,
  currency: "USD",
  imageUrl: "https://img.example/a.png",
  setName: "Obsidian Flames",
  cardName: "Charizard ex",
  fmvUsd: 140,
  status: "active",
  indexedAt: "2026-05-21T10:00:00.000Z",
  staleAfter: "2026-05-22T10:00:00.000Z",
};

const phygitalsSampleListing: ExternalListingItem = {
  id: "pg-charizard-ex-001",
  source: "phygitals",
  externalId: "charizard-ex-001",
  deepLinkUrl: "https://phygitals.com/invite/slabvault",
  title: "Charizard ex #199",
  grade: "PSA 10",
  grader: "PSA",
  certNumber: "8123456789",
  priceUsd: 425,
  priceSol: null,
  currency: "USD",
  imageUrl: "https://d1xpxki1g4htqu.cloudfront.net/example.png",
  setName: "Obsidian Flames",
  cardName: "Charizard ex",
  fmvUsd: 410,
  status: "active",
  indexedAt: "2026-05-22T22:46:57.629Z",
  staleAfter: "2026-05-23T22:46:57.629Z",
};

test("parsePartnerPlatformParam accepts slug aliases", () => {
  assert.equal(parsePartnerPlatformParam("collector_crypt"), "collector_crypt");
  assert.equal(parsePartnerPlatformParam("collector-crypt"), "collector_crypt");
  assert.equal(parsePartnerPlatformParam("phygitals"), "phygitals");
  assert.equal(parsePartnerPlatformParam("magic-eden"), null);
});

test("slugToPartnerPlatform maps trade collection slugs", () => {
  assert.equal(slugToPartnerPlatform("collector-crypt"), "collector_crypt");
  assert.equal(slugToPartnerPlatform("phygitals"), "phygitals");
  assert.equal(partnerPlatformToSlug("collector_crypt"), "collector-crypt");
});

test("isPartnerIngestSupported covers CC and Phygitals only", () => {
  assert.equal(isPartnerIngestSupported("collector_crypt"), true);
  assert.equal(isPartnerIngestSupported("phygitals"), true);
  assert.equal(isPartnerIngestSupported("magic_eden"), false);
  assert.equal(isPartnerIngestSupported("slabvault_treasury"), false);
});

test("resolvePartnerDeepLink returns cert search when CC marketplace link is generic", () => {
  const listing = mapPartnerListingToTradeListing(sampleListing, "collector-crypt");
  const link = resolvePartnerDeepLink(listing, "collector_crypt");

  assert.equal(link, "https://collectorcrypt.com/marketplace?q=1234567890");
});

test("resolvePartnerDeepLink preserves item-specific CC gacha URLs", () => {
  const row: ExternalListingItem = {
    ...sampleListing,
    deepLinkUrl: "https://gacha.collectorcrypt.com/r/x843qqp9u5vf",
  };
  const listing = mapPartnerListingToTradeListing(row, "collector-crypt");

  assert.equal(
    resolvePartnerDeepLink(listing, "collector_crypt"),
    "https://gacha.collectorcrypt.com/r/x843qqp9u5vf",
  );
});

test("resolvePartnerDeepLink returns invite fallback when Phygitals link is generic", () => {
  const listing = mapPartnerListingToTradeListing(phygitalsSampleListing, "phygitals");
  const link = resolvePartnerDeepLink(listing, "phygitals");

  assert.equal(link, "https://phygitals.com/invite/slabvault");
});

test("resolvePartnerDeepLink preserves item-specific Phygitals URLs", () => {
  const row: ExternalListingItem = {
    ...phygitalsSampleListing,
    deepLinkUrl: "https://phygitals.com/invite/slabvault/card-a",
  };
  const listing = mapPartnerListingToTradeListing(row, "phygitals");

  assert.equal(
    resolvePartnerDeepLink(listing, "phygitals"),
    "https://phygitals.com/invite/slabvault/card-a",
  );
});

test("mapPartnerListingToTradeListing sets vaultedUrl for phygitals seed row", () => {
  const trade = mapPartnerListingToTradeListing(phygitalsSampleListing, "phygitals");

  assert.equal(trade.vaultedUrl, "https://phygitals.com/invite/slabvault");
  assert.equal(trade.collectionId, "phygitals");
  assert.equal(trade.id, "8123456789");
});

test("mapPartnerListingToTradeListing converts USD ask to SOL estimate", () => {
  const trade = mapPartnerListingToTradeListing(sampleListing, "collector-crypt");

  assert.equal(trade.id, "1234567890");
  assert.match(trade.name, /Charizard ex #1234567890/);
  assert.equal(trade.askSol, 150 / PARTNER_SOL_USD_ESTIMATE);
  assert.equal(trade.collectionId, "collector-crypt");
  assert.equal(trade.vaultedUrl, "https://collectorcrypt.com/marketplace?q=1234567890");
  assert.equal(trade.sellerWallet, undefined);
  assert.equal(trade.listState, undefined);
});

test("mapPartnerListingToTradeListing passes seller metadata when present", () => {
  const seller = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
  const listState = "ListState1111111111111111111111111111111111111";
  const trade = mapPartnerListingToTradeListing(
    {
      ...sampleListing,
      sellerWallet: seller,
      listState,
    },
    "collector-crypt",
  );

  assert.equal(trade.sellerWallet, seller);
  assert.equal(trade.listState, listState);
});

test("shouldUseLiveScrapeFallback requires stale or empty rows unless ?live=1", async () => {
  const { shouldUseLiveScrapeFallback } = await import("@/lib/partner-listings");

  const freshListing: ExternalListingItem = {
    ...sampleListing,
    indexedAt: new Date().toISOString(),
    staleAfter: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  await withTemporaryEnv(
    { PARTNER_LIVE_SCRAPE_ENABLED: "true", NODE_ENV: "development" },
    () => {
      assert.equal(
        shouldUseLiveScrapeFallback("collector_crypt", [], { includeLiveScrape: false }),
        true,
      );
      assert.equal(
        shouldUseLiveScrapeFallback("collector_crypt", [freshListing], {
          includeLiveScrape: false,
        }),
        false,
      );
      assert.equal(
        shouldUseLiveScrapeFallback("collector_crypt", [freshListing], {
          includeLiveScrape: true,
        }),
        true,
      );
    },
  );
});

test("getPartnerListingSeedCount returns active rows from JSON seed", () => {
  assert.ok(getPartnerListingSeedCount("collector_crypt") >= 1);
  assert.ok(getPartnerListingSeedCount("phygitals") >= 1);
});

test("getPartnerListingSources documents ingest catalog and env flags", async () => {
  await withTemporaryEnv(
    {
      DATABASE_URL: undefined,
      TENSOR_API_KEY: undefined,
      HELIUS_API_KEY: undefined,
      PARTNER_LIVE_SCRAPE_ENABLED: undefined,
    },
    () => {
      const sources = getPartnerListingSources();
      const ids = sources.map((row) => row.id);

      assert.deepEqual(ids, [
        "external_db",
        "partner_api",
        "external_json",
        "cc_scraper",
        "helius_das",
        "tensor_api",
      ]);
      assert.equal(sources.find((row) => row.id === "external_json")?.configured, true);
      assert.equal(sources.find((row) => row.id === "external_db")?.configured, false);
      assert.equal(sources.find((row) => row.id === "cc_scraper")?.configured, false);
      assert.equal(sources.find((row) => row.id === "helius_das")?.configured, false);
      assert.equal(sources.find((row) => row.id === "tensor_api")?.configured, false);
      assert.deepEqual(
        sources.find((row) => row.id === "cc_scraper")?.platforms,
        ["collector_crypt"],
      );
    },
  );

  await withTemporaryEnv(
    {
      DATABASE_URL: "postgresql://localhost:5432/grails",
      TENSOR_API_KEY: "tensor-test-key",
      HELIUS_API_KEY: "helius-test-key",
      PARTNER_LIVE_SCRAPE_ENABLED: "true",
    },
    () => {
      const sources = getPartnerListingSources();

      assert.equal(sources.find((row) => row.id === "external_db")?.configured, true);
      assert.equal(sources.find((row) => row.id === "cc_scraper")?.configured, true);
      assert.equal(sources.find((row) => row.id === "helius_das")?.configured, true);
      assert.equal(sources.find((row) => row.id === "tensor_api")?.configured, true);
    },
  );
});

test("listPartnerTradeListings loads collector-crypt without Helius or Tensor keys", async () => {
  await withTemporaryEnv(
    {
      DATABASE_URL: undefined,
      HELIUS_API_KEY: undefined,
      TENSOR_API_KEY: undefined,
    },
    async () => {
      const collection = getTradeCollectionBySlug("collector-crypt");
      assert.ok(collection);

      const result = await listPartnerTradeListings(collection);

      assert.equal(result.slug, "collector-crypt");
      assert.equal(result.platform, "collector_crypt");
      assert.ok(result.listings.length >= 1);
      assert.equal(
        result.listings.every((row) => row.collectionId === "collector-crypt"),
        true,
      );
      assert.equal(result.fromFallback, true);
      assert.equal(result.dbStatus, "unconfigured");
      assert.ok(result.sources.includes("external_json"));
      assert.equal(result.sources.includes("helius_das"), false);
      assert.equal(result.sources.includes("tensor_api"), false);
      assert.equal(result.tensorEnrichment, null);
    },
  );
});

test("listPartnerTradeListings loads phygitals without Tensor key", async () => {
  await withTemporaryEnv({ DATABASE_URL: undefined, TENSOR_API_KEY: undefined }, async () => {
    const collection = getTradeCollectionBySlug("phygitals");
    assert.ok(collection);

    const result = await listPartnerTradeListings(collection);

    assert.ok(result.listings.length >= 1);
    assert.equal(result.listings.every((row) => row.collectionId === "phygitals"), true);
  });
});

test("getPartnerStatsForPlatform returns floor and count without full listing payload", async () => {
  await withTemporaryEnv({ DATABASE_URL: undefined, TENSOR_API_KEY: undefined }, async () => {
    const result = await getPartnerStatsForPlatform("collector_crypt");

    assert.ok(result);
    assert.equal(result.platform, "collector_crypt");
    assert.equal(result.slug, "collector-crypt");
    assert.ok(result.stats.listedCount >= 1);
    assert.ok(result.stats.floorSol != null && result.stats.floorSol > 0);
    assert.equal(result.readConfigured, true);
    assert.ok(result.sources.length >= 1);
  });
});

test("looksLikeSolanaMint accepts base58 mints and rejects UUID partner ids", () => {
  assert.equal(
    looksLikeSolanaMint("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"),
    true,
  );
  assert.equal(
    looksLikeSolanaMint("5be074a0-c8bd-4a31-954a-9b523949e654"),
    false,
  );
});

test("mergePartnerListingsWithTensorMetadata matches by cert and merges seller fields", () => {
  const seller = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
  const listState = "ListState1111111111111111111111111111111111111";
  const mint = "Mint1111111111111111111111111111111111111";

  const { rows, stats } = mergePartnerListingsWithTensorMetadata(
    [sampleListing],
    [
      {
        mint,
        name: "Charizard ex",
        imageUri: null,
        priceLamports: 1_000_000_000,
        priceSol: 1,
        rarityRank: null,
        attributes: [{ trait_type: "Cert Number", value: "1234567890" }],
        sellerWallet: seller,
        listState,
      },
    ],
  );

  assert.equal(stats.matchedByCert, 1);
  assert.equal(stats.enrichedSeller, 1);
  assert.equal(rows[0]?.sellerWallet, seller);
  assert.equal(rows[0]?.listState, listState);
  assert.equal(rows[0]?.externalId, mint);

  const trade = mapPartnerListingToTradeListing(rows[0]!, "collector-crypt");
  assert.equal(trade.id, mint);
  assert.equal(trade.sellerWallet, seller);
  assert.equal(trade.listState, listState);
});

test("cert-keyed partner row resolves mint from vaultedUrl after Tensor seller enrichment (M3 path)", () => {
  const seller = "Seller2222222222222222222222222222222222222";
  const listState = "ListState1111111111111111111111111111111111111";
  const mint = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
  const cert = "1234567890";

  const certKeyedRow: ExternalListingItem = {
    ...sampleListing,
    externalId: "5be074a0-c8bd-4a31-954a-9b523949e654",
    certNumber: cert,
    sellerWallet: null,
    listState: null,
    deepLinkUrl: `https://solscan.io/token/${mint}`,
  };

  const { rows, stats } = mergePartnerListingsWithTensorMetadata(
    [certKeyedRow],
    [
      {
        mint,
        name: "Charizard ex",
        imageUri: null,
        priceLamports: 1_000_000_000,
        priceSol: 1,
        rarityRank: null,
        attributes: [{ trait_type: "Cert Number", value: cert }],
        sellerWallet: seller,
        listState,
      },
    ],
  );

  assert.equal(stats.matchedByCert, 1);
  assert.equal(stats.matchedByMint, 0);
  assert.equal(stats.enrichedSeller, 1);
  assert.equal(stats.withSellerMetadata, 1);
  assert.equal(rows[0]?.sellerWallet, seller);
  assert.equal(rows[0]?.listState, listState);
  assert.equal(rows[0]?.externalId, mint);

  const trade = mapPartnerListingToTradeListing(rows[0]!, "collector-crypt");
  assert.equal(trade.sellerWallet, seller);
  assert.equal(trade.listState, listState);
  assert.equal(trade.vaultedUrl, `https://solscan.io/token/${mint}`);
  assert.equal(resolveTradeListingMint(trade), mint);
  assert.equal(trade.id, mint);

  const certIdOnlyTrade = mapPartnerListingToTradeListing(
    {
      ...certKeyedRow,
      sellerWallet: seller,
      listState,
    },
    "collector-crypt",
  );
  assert.equal(certIdOnlyTrade.id, cert);
  assert.equal(certIdOnlyTrade.vaultedUrl, `https://solscan.io/token/${mint}`);
  assert.equal(resolveTradeListingMint(certIdOnlyTrade), mint);
});

test("partnerListingDedupeKeys normalizes cert formatting and cert-like externalId", () => {
  const formatted = partnerListingDedupeKeys({
    ...sampleListing,
    certNumber: "1234-567-890",
    externalId: "partner-uuid",
  });
  assert.deepEqual(formatted, [
    "cert:1234567890",
    "id:collector_crypt:partner-uuid",
  ]);

  const fromExternalId = partnerListingDedupeKeys({
    ...sampleListing,
    certNumber: null,
    externalId: "1234567890",
  });
  assert.deepEqual(fromExternalId, ["cert:1234567890"]);

  const mint = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
  const mintKeys = partnerListingDedupeKeys({
    ...sampleListing,
    certNumber: "1234567890",
    externalId: mint,
  });
  assert.deepEqual(mintKeys, ["cert:1234567890", `mint:${mint}`]);
});

test("mergePartnerExternalListings dedupes cert vs externalId and prefers richer row", () => {
  const seller = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
  const merged = mergePartnerExternalListings(
    [{ ...sampleListing, externalId: "1234567890", certNumber: null }],
    [
      {
        ...sampleListing,
        externalId: "uuid-secondary",
        sellerWallet: seller,
        listState: "ListState1111111111111111111111111111111111111",
      },
    ],
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.sellerWallet, seller);
  assert.equal(merged[0]?.certNumber, "1234567890");
});

test("mergePartnerExternalListings aliases cert and mint for the same card", () => {
  const mint = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
  const merged = mergePartnerExternalListings(
    [{ ...sampleListing, externalId: mint, certNumber: "1234567890" }],
    [{ ...sampleListing, externalId: "partner-uuid", certNumber: "1234567890" }],
  );

  assert.equal(merged.length, 1);
});

test("mergePartnerExternalListings dedupes same cert across CC and Phygitals with lower priceSol", () => {
  const cert = "9876543210";
  const ccRow: ExternalListingItem = {
    ...sampleListing,
    id: "cc-cross-001",
    source: "collector_crypt",
    externalId: "cc-cross-uuid",
    certNumber: cert,
    priceSol: 2.5,
    priceUsd: null,
    currency: "SOL",
    deepLinkUrl: "https://collectorcrypt.com/marketplace/card-a",
  };
  const phyRow: ExternalListingItem = {
    ...sampleListing,
    id: "phy-cross-001",
    source: "phygitals",
    externalId: "phy-cross-uuid",
    certNumber: cert,
    priceSol: 1.2,
    priceUsd: null,
    currency: "SOL",
    deepLinkUrl: "https://phygitals.com/invite/slabvault/card-a",
  };

  const merged = mergePartnerExternalListings([ccRow], [phyRow]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.certNumber, cert);
  assert.equal(merged[0]?.priceSol, 1.2);
  assert.equal(merged[0]?.source, "phygitals");
  assert.equal(merged[0]?.deepLinkUrl, phyRow.deepLinkUrl);
  assert.equal(
    partnerListingDedupeKeys(ccRow).some((key) =>
      partnerListingDedupeKeys(phyRow).includes(key),
    ),
    true,
  );
});

test("mergePartnerExternalListings preserves DAS sellerWallet when seed row wins on listState", () => {
  const seller = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
  const listState = "ListState1111111111111111111111111111111111111";
  const mint = "Mint5555555555555555555555555555555555555";
  const seedRow: ExternalListingItem = {
    ...sampleListing,
    externalId: "5be074a0-c8bd-4a31-954a-9b523949e654",
    sellerWallet: null,
    listState,
    priceSol: 1.5,
  };
  const dasRow: ExternalListingItem = {
    ...sampleListing,
    id: `cc-${mint}`,
    externalId: mint,
    certNumber: "1234567890",
    sellerWallet: seller,
    listState: null,
    priceUsd: null,
    priceSol: null,
  };

  const merged = mergePartnerExternalListings([seedRow], [dasRow]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.sellerWallet, seller);
  assert.equal(merged[0]?.listState, listState);
  assert.equal(merged[0]?.externalId, mint);
  assert.equal(merged[0]?.priceSol, 1.5);

  const trade = mapPartnerListingToTradeListing(merged[0]!, "collector-crypt");
  assert.equal(trade.sellerWallet, seller);
  assert.equal(trade.listState, listState);
  assert.equal(trade.id, mint);
});

test("listPartnerTradeListings returns unique trade ids", async () => {
  await withTemporaryEnv({ DATABASE_URL: undefined, TENSOR_API_KEY: undefined }, async () => {
    for (const slug of ["collector-crypt", "phygitals"] as const) {
      const collection = getTradeCollectionBySlug(slug);
      assert.ok(collection);
      const result = await listPartnerTradeListings(collection);
      const ids = result.listings.map((row) => row.id);
      assert.equal(ids.length, new Set(ids).size, `duplicate trade ids for ${slug}`);
    }
  });
});

test("mergePartnerListingsWithTensorMetadata matches by mint on externalId", () => {
  const mint = "Mint2222222222222222222222222222222222222";
  const seller = "Seller2222222222222222222222222222222222222";

  const { stats } = mergePartnerListingsWithTensorMetadata(
    [{ ...sampleListing, externalId: mint, certNumber: null }],
    [
      {
        mint,
        name: "Pikachu",
        imageUri: null,
        priceLamports: 500_000_000,
        priceSol: 0.5,
        rarityRank: null,
        attributes: [],
        sellerWallet: seller,
        listState: null,
      },
    ],
  );

  assert.equal(stats.matchedByMint, 1);
  assert.equal(stats.matchedByCert, 0);
});

test("mergePartnerListingsWithTensorMetadata matches cert from externalId when certNumber absent", () => {
  const seller = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
  const listState = "ListState1111111111111111111111111111111111111";
  const mint = "Mint3333333333333333333333333333333333333";

  const { rows, stats } = mergePartnerListingsWithTensorMetadata(
    [{ ...sampleListing, externalId: "1234567890", certNumber: null }],
    [
      {
        mint,
        name: "Charizard ex",
        imageUri: null,
        priceLamports: 1_000_000_000,
        priceSol: 1,
        rarityRank: null,
        attributes: [{ trait_type: "Cert", value: "1234567890" }],
        sellerWallet: seller,
        listState,
      },
    ],
  );

  assert.equal(stats.matchedByCert, 1);
  assert.equal(stats.withSellerMetadata, 1);
  assert.equal(rows[0]?.sellerWallet, seller);
  assert.equal(rows[0]?.listState, listState);
  assert.equal(rows[0]?.externalId, mint);
  assert.equal(rows[0]?.certNumber, "1234567890");
});

test("dedupePartnerTradeListings aliases cert and mint ids and keeps seller metadata", () => {
  const seller = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
  const listState = "ListState1111111111111111111111111111111111111";
  const mint = "Mint4444444444444444444444444444444444444";

  const sparse = mapPartnerListingToTradeListing(sampleListing, "collector-crypt");
  const enriched = mapPartnerListingToTradeListing(
    {
      ...sampleListing,
      externalId: mint,
      sellerWallet: seller,
      listState,
    },
    "collector-crypt",
  );

  const deduped = dedupePartnerTradeListings([sparse, enriched]);

  assert.equal(deduped.length, 1);
  assert.equal(deduped[0]?.sellerWallet, seller);
  assert.equal(deduped[0]?.listState, listState);
  assert.equal(deduped[0]?.id, mint);
});

test("dedupePartnerTradeListings preserves alternateVenueAsks across CC and Phygitals", () => {
  const mint = "Mint7777777777777777777777777777777777777";
  const cert = "1111222233";

  const ccListing = mapPartnerListingToTradeListing(
    {
      ...sampleListing,
      id: "cc-alt-001",
      source: "collector_crypt",
      externalId: mint,
      certNumber: cert,
      priceSol: 2.2,
      priceUsd: null,
      currency: "SOL",
    },
    "collector-crypt",
  );
  const phyListing = mapPartnerListingToTradeListing(
    {
      ...sampleListing,
      id: "phy-alt-001",
      source: "phygitals",
      externalId: mint,
      certNumber: cert,
      priceSol: 1.4,
      priceUsd: null,
      currency: "SOL",
    },
    "phygitals",
  );

  const deduped = dedupePartnerTradeListings([ccListing, phyListing]);

  assert.equal(deduped.length, 1);
  assert.equal(deduped[0]?.askSol, 1.4);
  assert.equal(deduped[0]?.partner, "phygitals");
  assert.equal(deduped[0]?.collectionId, "phygitals");
  assert.deepEqual(deduped[0]?.alternateVenueAsks, [
    {
      partner: "collector_crypt",
      askSol: 2.2,
      collectionId: "collector-crypt",
    },
  ]);
});

test("dedupePartnerTradeListings attributes partner and collectionId to cheaper CC venue", () => {
  const seller = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
  const mint = "Mint8888888888888888888888888888888888888";
  const cert = "2222333344";

  const phyListing = mapPartnerListingToTradeListing(
    {
      ...sampleListing,
      id: "phy-win-001",
      source: "phygitals",
      externalId: mint,
      certNumber: cert,
      priceSol: 2.4,
      priceUsd: null,
      currency: "SOL",
      sellerWallet: seller,
      listState: "ListState1111111111111111111111111111111111111",
      deepLinkUrl: "https://phygitals.com/invite/slabvault/card-b",
    },
    "phygitals",
  );
  const ccListing = mapPartnerListingToTradeListing(
    {
      ...sampleListing,
      id: "cc-win-001",
      source: "collector_crypt",
      externalId: mint,
      certNumber: cert,
      priceSol: 1.1,
      priceUsd: null,
      currency: "SOL",
      deepLinkUrl: "https://collectorcrypt.com/marketplace/card-b",
    },
    "collector-crypt",
  );

  const deduped = dedupePartnerTradeListings([phyListing, ccListing]);

  assert.equal(deduped.length, 1);
  assert.equal(deduped[0]?.askSol, 1.1);
  assert.equal(deduped[0]?.partner, "collector_crypt");
  assert.equal(deduped[0]?.collectionId, "collector-crypt");
  assert.equal(deduped[0]?.vaultedUrl, "https://collectorcrypt.com/marketplace/card-b");
  assert.equal(deduped[0]?.sellerWallet, seller);
  assert.equal(deduped[0]?.listState, "ListState1111111111111111111111111111111111111");
});

test("dedupePartnerTradeListings keeps lowest askSol across alias rows", () => {
  const seller = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
  const listState = "ListState1111111111111111111111111111111111111";
  const mint = "Mint6666666666666666666666666666666666666";

  const expensive = mapPartnerListingToTradeListing(
    { ...sampleListing, priceSol: 2.5, priceUsd: null },
    "collector-crypt",
  );
  const cheaper = mapPartnerListingToTradeListing(
    {
      ...sampleListing,
      externalId: mint,
      priceSol: 1.25,
      priceUsd: null,
      sellerWallet: seller,
      listState,
    },
    "collector-crypt",
  );

  const deduped = dedupePartnerTradeListings([expensive, cheaper]);

  assert.equal(deduped.length, 1);
  assert.equal(deduped[0]?.askSol, 1.25);
  assert.equal(deduped[0]?.sellerWallet, seller);
  assert.equal(deduped[0]?.listState, listState);
  assert.equal(deduped[0]?.id, mint);
});

test("mergePartnerExternalListings keeps lowest ask across ingest batches", () => {
  const seller = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
  const merged = mergePartnerExternalListings(
    [{ ...sampleListing, priceSol: 2, priceUsd: null }],
    [
      {
        ...sampleListing,
        externalId: "1234567890",
        priceSol: 1.1,
        priceUsd: null,
        sellerWallet: seller,
      },
    ],
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.priceSol, 1.1);
  assert.equal(merged[0]?.sellerWallet, seller);
});
