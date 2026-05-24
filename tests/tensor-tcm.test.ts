import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

import { Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";

import {
  buildFillTransaction,
  buildListTransaction,
  fetchCollectionStats,
  listListings,
  resolveTensorSlugForCollection,
  TensorTradeWriteDisabledError,
} from "@/lib/onchain/clients/tensor-tcm";
import {
  __setTensorTcmSdkDepsForTests,
  assertTcmProgramIdsAligned,
} from "@/lib/onchain/clients/tensor-tcm-sdk";
import { TENSOR_PROGRAM_IDS } from "@/lib/onchain/program-ids";
import { withTemporaryEnv } from "./helpers/test-helpers";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnv };
  __setTensorTcmSdkDepsForTests(null);
});

const MOCK_IX = new TransactionInstruction({
  programId: new PublicKey(TENSOR_PROGRAM_IDS.marketplaceTcm),
  keys: [],
  data: Buffer.from([1, 2, 3]),
});

function mockSwapSdk() {
  return {
    list: async () => ({ tx: { ixs: [MOCK_IX], extraSigners: [] } }),
    buySingleListing: async () => ({
      tx: { ixs: [MOCK_IX], extraSigners: [] },
    }),
  };
}

function mockTcompSdk(listState: {
  assetId: PublicKey;
  owner: PublicKey;
  amount: { toString: () => string };
}) {
  return {
    fetchListState: async () => listState,
  };
}

test("resolveTensorSlugForCollection maps collector-crypt to env slug", () => {
  process.env.TENSOR_API_KEY = "test-key";
  process.env.TENSOR_CC_COLLECTION_SLUGS = "collector_crypt,cc_alt";

  assert.equal(resolveTensorSlugForCollection("collector-crypt"), "collector_crypt");
});

test("fetchCollectionStats returns tensor_api stats when API responds", async () => {
  process.env.TENSOR_API_KEY = "test-key";
  process.env.TENSOR_API_BASE_URL = "https://api.example.test";

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        collections: [
          {
            collId: "abc",
            slug: "collector_crypt",
            slugDisplay: "collector_crypt",
            name: "Collector Crypt",
            statsV2: {
              numListed: 12,
              buyNowPrice: 2_500_000_000,
              floor24h: 2_000_000_000,
              volume24h: 10_000_000_000,
              volumeAll: 100_000_000_000,
              sales24h: 3,
              numMints: 100,
              pctListed: 12,
            },
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  const result = await fetchCollectionStats("collector-crypt");

  assert.equal(result.source, "tensor_api");
  assert.equal(result.stats?.numListed, 12);
  assert.equal(result.stats?.floorPriceSol, 2.5);
  assert.equal(result.stats?.volume24hSol, 10);
  assert.equal(result.stats?.volumeAllSol, 100);
  assert.equal(result.stats?.sales24h, 3);
  assert.equal(result.stats?.numMints, 100);
  assert.equal(result.stats?.pctListed, 12);
  assert.ok(
    result.stats?.priceChange24hPct != null &&
      Math.abs(result.stats.priceChange24hPct - 25) < 0.01,
  );
});

test("listListings returns unconfigured empty page without API key", async () => {
  delete process.env.TENSOR_API_KEY;

  const result = await listListings("collector-crypt");

  assert.equal(result.source, "unconfigured");
  assert.deepEqual(result.page.listings, []);
});

test("listListings maps mint rows from Tensor API", async () => {
  process.env.TENSOR_API_KEY = "test-key";
  process.env.TENSOR_API_BASE_URL = "https://api.example.test";

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        mints: [
          {
            mint: "Mint1111111111111111111111111111111111111",
            name: "Charizard",
            imageUri: "https://img.example/a.png",
            listing: { price: 1_000_000_000 },
            attributes: [{ trait_type: "Grade", value: "PSA 10" }],
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  const result = await listListings("collector_crypt", { limit: 10 });

  assert.equal(result.source, "tensor_api");
  assert.equal(result.page.listings.length, 1);
  assert.equal(result.page.listings[0]?.priceSol, 1);
  assert.equal(result.page.listings[0]?.attributes[0]?.value, "PSA 10");
});

describe("TCM program ids", () => {
  test("assertTcmProgramIdsAligned matches mainnet TCM id", () => {
    assert.doesNotThrow(() => assertTcmProgramIdsAligned());
    assert.equal(
      TENSOR_PROGRAM_IDS.marketplaceTcm,
      "TCMPhJdwDryooaGtiocG1u3xcYbRpiJzb283XfCZsDp",
    );
  });
});

describe("tensor-tx-bff write path resolution", () => {
  test("resolveBuyWritePath defaults to sdk without API key", async () => {
    await withTemporaryEnv({ TENSOR_API_KEY: undefined }, async () => {
      const { resolveBuyWritePath } = await import("@/lib/onchain/tensor-tx-bff");
      assert.equal(resolveBuyWritePath(null), "sdk");
    });
  });
});

describe("tensor-tcm write path", () => {
  test("buildListTransaction throws when TENSOR_TRADE_WRITE_ENABLED is off", async () => {
    delete process.env.TENSOR_TRADE_WRITE_ENABLED;

    await assert.rejects(
      () =>
        buildListTransaction({
          connection: { rpcEndpoint: "http://127.0.0.1:8899" } as never,
          seller: Keypair.generate().publicKey,
          mint: Keypair.generate().publicKey,
          priceLamports: 1_000_000_000n,
        }),
      TensorTradeWriteDisabledError,
    );
  });

  test("buildFillTransaction throws when TENSOR_TRADE_WRITE_ENABLED is off", async () => {
    process.env.TENSOR_TRADE_WRITE_ENABLED = "false";

    await assert.rejects(
      () =>
        buildFillTransaction({
          connection: { rpcEndpoint: "http://127.0.0.1:8899" } as never,
          buyer: Keypair.generate().publicKey,
          mint: Keypair.generate().publicKey,
        }),
      TensorTradeWriteDisabledError,
    );
  });

  test("buildListTransaction returns tx with SDK instructions when write enabled", async () => {
    process.env.TENSOR_TRADE_WRITE_ENABLED = "true";
    __setTensorTcmSdkDepsForTests({ swapSdk: mockSwapSdk() });

    const seller = Keypair.generate().publicKey;
    const mint = Keypair.generate().publicKey;

    const tx = await buildListTransaction({
      connection: { rpcEndpoint: "http://127.0.0.1:8899" } as never,
      seller,
      mint,
      priceLamports: 2_500_000_000n,
    });

    assert.ok(tx instanceof Transaction);
    assert.equal(tx.instructions.length, 1);
    assert.equal(
      tx.instructions[0]?.programId.toBase58(),
      TENSOR_PROGRAM_IDS.marketplaceTcm,
    );
  });

  test("buildFillTransaction uses listState from tcomp-sdk when write enabled", async () => {
    process.env.TENSOR_TRADE_WRITE_ENABLED = "true";

    const mint = Keypair.generate().publicKey;
    const buyer = Keypair.generate().publicKey;
    const owner = Keypair.generate().publicKey;
    const listState = Keypair.generate().publicKey;

    __setTensorTcmSdkDepsForTests({
      swapSdk: mockSwapSdk(),
      tcompSdk: mockTcompSdk({
        assetId: mint,
        owner,
        amount: { toString: () => "1500000000" },
      }),
    });

    const tx = await buildFillTransaction({
      connection: { rpcEndpoint: "http://127.0.0.1:8899" } as never,
      buyer,
      mint,
      listState,
    });

    assert.equal(tx.instructions.length, 1);
  });

  test("buildFillTransaction rejects listState mint mismatch", async () => {
    process.env.TENSOR_TRADE_WRITE_ENABLED = "true";

    __setTensorTcmSdkDepsForTests({
      swapSdk: mockSwapSdk(),
      tcompSdk: mockTcompSdk({
        assetId: Keypair.generate().publicKey,
        owner: Keypair.generate().publicKey,
        amount: { toString: () => "1" },
      }),
    });

    await assert.rejects(
      () =>
        buildFillTransaction({
          connection: { rpcEndpoint: "http://127.0.0.1:8899" } as never,
          buyer: Keypair.generate().publicKey,
          mint: Keypair.generate().publicKey,
          listState: Keypair.generate().publicKey,
        }),
      /listState assetId does not match fill mint/,
    );
  });
});
