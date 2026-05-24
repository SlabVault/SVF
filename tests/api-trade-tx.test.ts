import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

import { GET as buyGet } from "@/app/api/trade/tx/buy/route";
import { GET as bidGet } from "@/app/api/trade/tx/bid/route";
import { GET as cancelBidGet } from "@/app/api/trade/tx/cancel-bid/route";
import { GET as delistGet } from "@/app/api/trade/tx/delist/route";
import { GET as listGet } from "@/app/api/trade/tx/list/route";
import { GET as collectionBidsGet } from "@/app/api/trade/collection-bids/route";
import { GET as collectionListingsGet } from "@/app/api/trade/collection-listings/route";
import { GET as collectionStatsGet } from "@/app/api/trade/collection-stats/route";
import { GET as walletBidsGet } from "@/app/api/trade/wallet/bids/route";
import {
  __setTensorTcmSdkDepsForTests,
} from "@/lib/onchain/clients/tensor-tcm-sdk";
import { TENSOR_PROGRAM_IDS } from "@/lib/onchain/program-ids";
import {
  resolveBuyWritePath,
  resolveListWritePath,
  TensorTradeWriteDisabledError,
} from "@/lib/onchain/tensor-tx-bff";
import { withTemporaryEnv } from "./helpers/test-helpers";

const originalFetch = globalThis.fetch;
const originalGetLatestBlockhash = Connection.prototype.getLatestBlockhash;

const MOCK_BLOCKHASH = "11111111111111111111111111111111";

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
    delist: async () => ({ tx: { ixs: [MOCK_IX], extraSigners: [] } }),
  };
}

function patchBlockhash() {
  Connection.prototype.getLatestBlockhash = async function () {
    return { blockhash: MOCK_BLOCKHASH, lastValidBlockHeight: 999_999 };
  };
}

function restoreBlockhash() {
  Connection.prototype.getLatestBlockhash = originalGetLatestBlockhash;
}

function buyUrl(query: Record<string, string>): string {
  const params = new URLSearchParams(query);
  return `http://localhost/api/trade/tx/buy?${params.toString()}`;
}

function listUrl(query: Record<string, string>): string {
  const params = new URLSearchParams(query);
  return `http://localhost/api/trade/tx/list?${params.toString()}`;
}

function delistUrl(query: Record<string, string>): string {
  const params = new URLSearchParams(query);
  return `http://localhost/api/trade/tx/delist?${params.toString()}`;
}

function cancelBidUrl(query: Record<string, string>): string {
  const params = new URLSearchParams(query);
  return `http://localhost/api/trade/tx/cancel-bid?${params.toString()}`;
}

const ROOT = process.cwd();

function readSource(relPath: string): string {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

function bidUrl(query: Record<string, string>): string {
  const params = new URLSearchParams(query);
  return `http://localhost/api/trade/tx/bid?${params.toString()}`;
}

beforeEach(() => {
  globalThis.fetch = originalFetch;
  patchBlockhash();
  __setTensorTcmSdkDepsForTests(null);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  restoreBlockhash();
  __setTensorTcmSdkDepsForTests(null);
});

describe("tensor tx BFF routes", () => {
  test("route handlers are exported", () => {
    assert.equal(typeof buyGet, "function");
    assert.equal(typeof bidGet, "function");
    assert.equal(typeof cancelBidGet, "function");
    assert.equal(typeof listGet, "function");
    assert.equal(typeof delistGet, "function");
    assert.equal(typeof collectionStatsGet, "function");
    assert.equal(typeof collectionListingsGet, "function");
    assert.equal(typeof walletBidsGet, "function");
  });

  test("buy route validates required params", async () => {
    await withTemporaryEnv(
      { TENSOR_TRADE_WRITE_ENABLED: "true", SOLANA_RPC_URL: "http://127.0.0.1:8899" },
      async () => {
        const response = await buyGet(new Request("http://localhost/api/trade/tx/buy"));
        assert.equal(response.status, 400);
      },
    );
  });

  test("tx routes reject when write path disabled", async () => {
    await withTemporaryEnv(
      {
        TENSOR_TRADE_WRITE_ENABLED: "false",
        SOLANA_RPC_URL: "http://127.0.0.1:8899",
        TENSOR_API_KEY: "test-key",
      },
      async () => {
        const buyer = Keypair.generate().publicKey.toBase58();
        const mint = Keypair.generate().publicKey.toBase58();
        const owner = Keypair.generate().publicKey.toBase58();

        const buyResponse = await buyGet(
          new Request(
            buyUrl({
              buyer,
              mint,
              owner,
              maxPrice: "1000000000",
            }),
          ),
        );
        assert.equal(buyResponse.status, 503);

        const listResponse = await listGet(
          new Request(
            `http://localhost/api/trade/tx/list?owner=${owner}&mint=${mint}&price=1000000000`,
          ),
        );
        assert.equal(listResponse.status, 503);

        const delistResponse = await delistGet(
          new Request(
            `http://localhost/api/trade/tx/delist?owner=${owner}&mint=${mint}`,
          ),
        );
        assert.equal(delistResponse.status, 503);

        const bidResponse = await bidGet(
          new Request(
            `http://localhost/api/trade/tx/bid?owner=${owner}&mint=${mint}&price=1000000000`,
          ),
        );
        assert.equal(bidResponse.status, 503);

        const cancelBidResponse = await cancelBidGet(
          new Request(
            `http://localhost/api/trade/tx/cancel-bid?bidStateAddress=${owner}`,
          ),
        );
        assert.equal(cancelBidResponse.status, 503);
      },
    );
  });

  test("buy route proxies Tensor REST when keyed and write enabled", async () => {
    await withTemporaryEnv(
      {
        TENSOR_TRADE_WRITE_ENABLED: "true",
        TENSOR_API_KEY: "test-key",
        TENSOR_API_BASE_URL: "https://api.example.test",
        SOLANA_RPC_URL: "http://127.0.0.1:8899",
      },
      async () => {
        let requestedUrl = "";
        globalThis.fetch = async (input) => {
          requestedUrl = String(input);
          return new Response(
            JSON.stringify({ txs: [{ txV0: "rest-tx-payload" }] }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        };

        const buyer = Keypair.generate().publicKey.toBase58();
        const mint = Keypair.generate().publicKey.toBase58();
        const owner = Keypair.generate().publicKey.toBase58();

        const response = await buyGet(
          new Request(
            buyUrl({
              buyer,
              mint,
              owner,
              maxPrice: "1500000000",
              writePath: "rest",
            }),
          ),
        );
        const body = (await response.json()) as {
          writePath: string;
          sdkWriteEnabled: boolean;
          txs: Array<{ txV0: string }>;
        };

        assert.equal(response.status, 200);
        assert.equal(body.writePath, "tensor_rest");
        assert.equal(body.sdkWriteEnabled, true);
        assert.equal(body.txs[0]?.txV0, "rest-tx-payload");
        assert.match(requestedUrl, /api\.example\.test\/api\/v1\/tx\/buy/);
        assert.match(requestedUrl, /blockhash=/);
      },
    );
  });

  test("buy route builds SDK fill tx when writePath=sdk", async () => {
    await withTemporaryEnv(
      {
        TENSOR_TRADE_WRITE_ENABLED: "true",
        SOLANA_RPC_URL: "http://127.0.0.1:8899",
      },
      async () => {
        __setTensorTcmSdkDepsForTests({ swapSdk: mockSwapSdk() });

        const buyer = Keypair.generate().publicKey.toBase58();
        const mint = Keypair.generate().publicKey.toBase58();
        const owner = Keypair.generate().publicKey.toBase58();

        const response = await buyGet(
          new Request(
            buyUrl({
              buyer,
              mint,
              owner,
              maxPrice: "1500000000",
              writePath: "sdk",
            }),
          ),
        );
        const body = (await response.json()) as {
          writePath?: string;
          sdkWriteEnabled?: boolean;
          txs?: Array<{ tx: string; blockhash: string }>;
          error?: string;
        };

        if (response.status !== 200) {
          assert.fail(`expected 200, got ${response.status}: ${body.error ?? JSON.stringify(body)}`);
        }
        assert.equal(body.writePath, "sdk");
        assert.equal(body.sdkWriteEnabled, true);
        assert.ok(body.txs[0]?.tx);
        assert.equal(body.txs[0]?.blockhash, MOCK_BLOCKHASH);

        const decoded = Transaction.from(Buffer.from(body.txs[0]!.tx, "base64"));
        assert.equal(decoded.instructions.length, 1);
      },
    );
  });

  test("buy route builds SDK fill tx from listState without owner", async () => {
    await withTemporaryEnv(
      {
        TENSOR_TRADE_WRITE_ENABLED: "true",
        SOLANA_RPC_URL: "http://127.0.0.1:8899",
      },
      async () => {
        const mint = Keypair.generate().publicKey;
        const listState = Keypair.generate().publicKey;
        const owner = Keypair.generate().publicKey;

        __setTensorTcmSdkDepsForTests({
          swapSdk: mockSwapSdk(),
          tcompSdk: {
            fetchListState: async () => ({
              assetId: mint,
              owner,
              amount: { toString: () => "1500000000" } as never,
            }),
          },
        });

        const buyer = Keypair.generate().publicKey.toBase58();

        const response = await buyGet(
          new Request(
            buyUrl({
              buyer,
              mint: mint.toBase58(),
              maxPrice: "1500000000",
              listState: listState.toBase58(),
              writePath: "sdk",
            }),
          ),
        );

        assert.equal(response.status, 200);
        const body = (await response.json()) as { writePath?: string; txs?: unknown[] };
        assert.equal(body.writePath, "sdk");
        assert.equal(body.txs?.length, 1);
      },
    );
  });

  test("tx routes return clear message when write disabled", async () => {
    await withTemporaryEnv(
      {
        TENSOR_TRADE_WRITE_ENABLED: "false",
        SOLANA_RPC_URL: "http://127.0.0.1:8899",
      },
      async () => {
        const response = await buyGet(
          new Request(
            buyUrl({
              buyer: Keypair.generate().publicKey.toBase58(),
              mint: Keypair.generate().publicKey.toBase58(),
              owner: Keypair.generate().publicKey.toBase58(),
              maxPrice: "1000000000",
            }),
          ),
        );
        const body = (await response.json()) as { error?: string };
        assert.equal(response.status, 503);
        assert.match(body.error ?? "", /TENSOR_TRADE_WRITE_ENABLED/);
      },
    );
  });

  test("list route proxies Tensor REST with feePayer", async () => {
    await withTemporaryEnv(
      {
        TENSOR_TRADE_WRITE_ENABLED: "true",
        TENSOR_API_KEY: "test-key",
        TENSOR_API_BASE_URL: "https://api.example.test",
        SOLANA_RPC_URL: "http://127.0.0.1:8899",
      },
      async () => {
        let requestedUrl = "";
        globalThis.fetch = async (input) => {
          requestedUrl = String(input);
          return new Response(JSON.stringify({ txs: [{ tx: "list-tx" }] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        };

        const owner = Keypair.generate().publicKey.toBase58();
        const mint = Keypair.generate().publicKey.toBase58();

        const response = await listGet(
          new Request(
            listUrl({
              owner,
              mint,
              price: "2000000000",
              writePath: "rest",
            }),
          ),
        );
        const body = (await response.json()) as {
          writePath: string;
          sdkWriteEnabled: boolean;
          txs: Array<{ tx: string }>;
        };

        assert.equal(response.status, 200);
        assert.equal(body.writePath, "tensor_rest");
        assert.equal(body.sdkWriteEnabled, true);
        assert.equal(body.txs[0]?.tx, "list-tx");
        assert.match(requestedUrl, /tx\/list/);
        assert.match(requestedUrl, /feePayer=/);
      },
    );
  });

  test("list route builds SDK list tx when writePath=sdk", async () => {
    await withTemporaryEnv(
      {
        TENSOR_TRADE_WRITE_ENABLED: "true",
        SOLANA_RPC_URL: "http://127.0.0.1:8899",
      },
      async () => {
        __setTensorTcmSdkDepsForTests({ swapSdk: mockSwapSdk() });

        const owner = Keypair.generate().publicKey.toBase58();
        const mint = Keypair.generate().publicKey.toBase58();

        const response = await listGet(
          new Request(
            listUrl({
              owner,
              mint,
              price: "2000000000",
              writePath: "sdk",
            }),
          ),
        );
        const body = (await response.json()) as {
          writePath?: string;
          sdkWriteEnabled?: boolean;
          txs?: Array<{ tx: string; blockhash: string }>;
          error?: string;
        };

        if (response.status !== 200) {
          assert.fail(`expected 200, got ${response.status}: ${body.error ?? JSON.stringify(body)}`);
        }
        assert.equal(body.writePath, "sdk");
        assert.equal(body.sdkWriteEnabled, true);
        assert.ok(body.txs?.[0]?.tx);
        assert.equal(body.txs?.[0]?.blockhash, MOCK_BLOCKHASH);

        const decoded = Transaction.from(Buffer.from(body.txs![0]!.tx, "base64"));
        assert.equal(decoded.instructions.length, 1);
      },
    );
  });

  test("delist route proxies Tensor REST when keyed", async () => {
    await withTemporaryEnv(
      {
        TENSOR_TRADE_WRITE_ENABLED: "true",
        TENSOR_API_KEY: "test-key",
        TENSOR_API_BASE_URL: "https://api.example.test",
        SOLANA_RPC_URL: "http://127.0.0.1:8899",
      },
      async () => {
        let requestedUrl = "";
        globalThis.fetch = async (input) => {
          requestedUrl = String(input);
          return new Response(JSON.stringify({ txs: [{ tx: "delist-tx" }] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        };

        const owner = Keypair.generate().publicKey.toBase58();
        const mint = Keypair.generate().publicKey.toBase58();

        const response = await delistGet(
          new Request(
            delistUrl({
              owner,
              mint,
              writePath: "rest",
            }),
          ),
        );
        const body = (await response.json()) as {
          writePath: string;
          sdkWriteEnabled: boolean;
        };

        assert.equal(response.status, 200);
        assert.equal(body.writePath, "tensor_rest");
        assert.equal(body.sdkWriteEnabled, true);
        assert.match(requestedUrl, /tx\/delist/);
      },
    );
  });

  test("delist route builds SDK delist tx when writePath=sdk", async () => {
    await withTemporaryEnv(
      {
        TENSOR_TRADE_WRITE_ENABLED: "true",
        SOLANA_RPC_URL: "http://127.0.0.1:8899",
      },
      async () => {
        __setTensorTcmSdkDepsForTests({ swapSdk: mockSwapSdk() });

        const owner = Keypair.generate().publicKey.toBase58();
        const mint = Keypair.generate().publicKey.toBase58();

        const response = await delistGet(
          new Request(
            delistUrl({
              owner,
              mint,
              writePath: "sdk",
            }),
          ),
        );
        const body = (await response.json()) as {
          writePath?: string;
          sdkWriteEnabled?: boolean;
          txs?: Array<{ tx: string; blockhash: string }>;
          error?: string;
        };

        if (response.status !== 200) {
          assert.fail(`expected 200, got ${response.status}: ${body.error ?? JSON.stringify(body)}`);
        }
        assert.equal(body.writePath, "sdk");
        assert.equal(body.sdkWriteEnabled, true);
        assert.ok(body.txs?.[0]?.tx);
        assert.equal(body.txs?.[0]?.blockhash, MOCK_BLOCKHASH);

        const decoded = Transaction.from(Buffer.from(body.txs![0]!.tx, "base64"));
        assert.equal(decoded.instructions.length, 1);
      },
    );
  });

  test("delist route defaults to SDK when Tensor API key absent", async () => {
    await withTemporaryEnv(
      {
        TENSOR_TRADE_WRITE_ENABLED: "true",
        SOLANA_RPC_URL: "http://127.0.0.1:8899",
      },
      async () => {
        __setTensorTcmSdkDepsForTests({ swapSdk: mockSwapSdk() });

        const owner = Keypair.generate().publicKey.toBase58();
        const mint = Keypair.generate().publicKey.toBase58();

        const response = await delistGet(
          new Request(delistUrl({ owner, mint })),
        );
        const body = (await response.json()) as { writePath?: string };

        assert.equal(response.status, 200);
        assert.equal(body.writePath, "sdk");
      },
    );
  });

  test("bid route validates required params", async () => {
    await withTemporaryEnv(
      { TENSOR_TRADE_WRITE_ENABLED: "true", SOLANA_RPC_URL: "http://127.0.0.1:8899" },
      async () => {
        const owner = Keypair.generate().publicKey.toBase58();
        const mint = Keypair.generate().publicKey.toBase58();
        const price = "1000000000";

        const missingCases: Array<{ label: string; query: Record<string, string> }> = [
          { label: "no params", query: {} },
          { label: "owner only", query: { owner } },
          { label: "mint only", query: { mint } },
          { label: "price only", query: { price } },
          { label: "owner and mint", query: { owner, mint } },
          { label: "owner and price", query: { owner, price } },
          { label: "mint and price", query: { mint, price } },
        ];

        for (const { label, query } of missingCases) {
          const response = await bidGet(new Request(bidUrl(query)));
          const body = (await response.json()) as { error?: string };
          assert.equal(response.status, 400, `${label}: expected 400`);
          assert.match(
            body.error ?? "",
            /owner, mint, and price are required/,
            `${label}: error message`,
          );
        }
      },
    );
  });

  test("bid route returns clear message when write disabled", async () => {
    await withTemporaryEnv(
      {
        TENSOR_TRADE_WRITE_ENABLED: "false",
        SOLANA_RPC_URL: "http://127.0.0.1:8899",
      },
      async () => {
        const owner = Keypair.generate().publicKey.toBase58();
        const mint = Keypair.generate().publicKey.toBase58();

        const response = await bidGet(
          new Request(bidUrl({ owner, mint, price: "1000000000" })),
        );
        const body = (await response.json()) as { error?: string };

        assert.equal(response.status, 503);
        assert.match(body.error ?? "", /TENSOR_TRADE_WRITE_ENABLED/);
      },
    );
  });

  test("bid route proxies Tensor REST with expireIn", async () => {
    await withTemporaryEnv(
      {
        TENSOR_TRADE_WRITE_ENABLED: "true",
        TENSOR_API_KEY: "test-key",
        TENSOR_API_BASE_URL: "https://api.example.test",
        SOLANA_RPC_URL: "http://127.0.0.1:8899",
      },
      async () => {
        let requestedUrl = "";
        globalThis.fetch = async (input) => {
          requestedUrl = String(input);
          return new Response(
            JSON.stringify({
              txs: [{ txV0: "bid-tx-payload" }],
              bidState: "BidState1111111111111111111111111111111111",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        };

        const owner = Keypair.generate().publicKey.toBase58();
        const mint = Keypair.generate().publicKey.toBase58();

        const response = await bidGet(
          new Request(
            `http://localhost/api/trade/tx/bid?owner=${owner}&mint=${mint}&price=1500000000&expireIn=604800`,
          ),
        );
        const body = (await response.json()) as {
          txs: Array<{ txV0: string }>;
          bidState: string;
        };

        assert.equal(response.status, 200);
        assert.equal(body.txs[0]?.txV0, "bid-tx-payload");
        assert.ok(body.bidState);
        assert.match(requestedUrl, /tx\/bid/);
        assert.match(requestedUrl, /expireIn=604800/);
        assert.match(requestedUrl, /blockhash=/);
      },
    );
  });

  test("bid route forwards SVF_BROKER_PUBKEY as makerBroker", async () => {
    await withTemporaryEnv(
      {
        TENSOR_TRADE_WRITE_ENABLED: "true",
        TENSOR_API_KEY: "test-key",
        TENSOR_API_BASE_URL: "https://api.example.test",
        SOLANA_RPC_URL: "http://127.0.0.1:8899",
        SVF_BROKER_PUBKEY: "Broker1111111111111111111111111111111111111",
      },
      async () => {
        let requestedUrl = "";
        globalThis.fetch = async (input) => {
          requestedUrl = String(input);
          return new Response(JSON.stringify({ txs: [{ tx: "bid-tx" }] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        };

        const owner = Keypair.generate().publicKey.toBase58();
        const mint = Keypair.generate().publicKey.toBase58();

        const response = await bidGet(
          new Request(
            `http://localhost/api/trade/tx/bid?owner=${owner}&mint=${mint}&price=1000000000`,
          ),
        );

        assert.equal(response.status, 200);
        assert.match(requestedUrl, /makerBroker=Broker1111111111111111111111111111111111111/);
      },
    );
  });

  test("cancel-bid route validates bidStateAddress", async () => {
    await withTemporaryEnv(
      { TENSOR_TRADE_WRITE_ENABLED: "true", SOLANA_RPC_URL: "http://127.0.0.1:8899" },
      async () => {
        const missingCases: Array<{ label: string; query: Record<string, string> }> = [
          { label: "no params", query: {} },
          { label: "empty bidStateAddress", query: { bidStateAddress: "" } },
          { label: "whitespace bidStateAddress", query: { bidStateAddress: "   " } },
        ];

        for (const { label, query } of missingCases) {
          const response = await cancelBidGet(new Request(cancelBidUrl(query)));
          const body = (await response.json()) as { error?: string };
          assert.equal(response.status, 400, `${label}: expected 400`);
          assert.match(
            body.error ?? "",
            /bidStateAddress is required/,
            `${label}: error message`,
          );
        }
      },
    );
  });

  test("cancel-bid route returns clear message when write disabled", async () => {
    await withTemporaryEnv(
      {
        TENSOR_TRADE_WRITE_ENABLED: "false",
        SOLANA_RPC_URL: "http://127.0.0.1:8899",
      },
      async () => {
        const bidState = Keypair.generate().publicKey.toBase58();

        const response = await cancelBidGet(
          new Request(cancelBidUrl({ bidStateAddress: bidState })),
        );
        const body = (await response.json()) as { error?: string };

        assert.equal(response.status, 503);
        assert.match(body.error ?? "", /TENSOR_TRADE_WRITE_ENABLED/);
      },
    );
  });

  test("cancel-bid route trims bidStateAddress for Tensor proxy", async () => {
    await withTemporaryEnv(
      {
        TENSOR_TRADE_WRITE_ENABLED: "true",
        TENSOR_API_KEY: "test-key",
        TENSOR_API_BASE_URL: "https://api.example.test",
        SOLANA_RPC_URL: "http://127.0.0.1:8899",
      },
      async () => {
        let requestedUrl = "";
        globalThis.fetch = async (input) => {
          requestedUrl = String(input);
          return new Response(JSON.stringify({ txs: [{ txV0: "trimmed-cancel" }] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        };

        const bidState = Keypair.generate().publicKey.toBase58();
        const response = await cancelBidGet(
          new Request(cancelBidUrl({ bidStateAddress: `  ${bidState}  ` })),
        );

        assert.equal(response.status, 200);
        assert.match(requestedUrl, new RegExp(`bidStateAddress=${bidState}`));
        assert.doesNotMatch(requestedUrl, /bidStateAddress=%20/);
      },
    );
  });

  test("cancel-bid route proxies Tensor REST", async () => {
    await withTemporaryEnv(
      {
        TENSOR_TRADE_WRITE_ENABLED: "true",
        TENSOR_API_KEY: "test-key",
        TENSOR_API_BASE_URL: "https://api.example.test",
        SOLANA_RPC_URL: "http://127.0.0.1:8899",
      },
      async () => {
        let requestedUrl = "";
        globalThis.fetch = async (input) => {
          requestedUrl = String(input);
          return new Response(JSON.stringify({ txs: [{ txV0: "cancel-bid-tx" }] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        };

        const bidState = Keypair.generate().publicKey.toBase58();
        const response = await cancelBidGet(
          new Request(cancelBidUrl({ bidStateAddress: bidState })),
        );
        const body = (await response.json()) as {
          txs: Array<{ txV0: string }>;
        };

        assert.equal(response.status, 200);
        assert.equal(body.txs[0]?.txV0, "cancel-bid-tx");
        assert.match(requestedUrl, /tx\/cancelBid/);
        assert.match(requestedUrl, /bidStateAddress=/);
        assert.match(requestedUrl, /blockhash=/);
      },
    );
  });

  test("cancel-bid route rejects untrusted origin when origin env on", async () => {
    await withTemporaryEnv(
      {
        TENSOR_TX_REQUIRE_TRUSTED_ORIGIN: "true",
        TENSOR_TRADE_WRITE_ENABLED: "false",
        NEXT_PUBLIC_SITE_URL: "https://slabvault.xyz",
        NODE_ENV: "production",
        SOLANA_RPC_URL: "http://127.0.0.1:8899",
      },
      async () => {
        const bidState = Keypair.generate().publicKey.toBase58();
        const response = await cancelBidGet(
          new Request(cancelBidUrl({ bidStateAddress: bidState }), {
            headers: { origin: "https://evil.example" },
          }),
        );
        const body = (await response.json()) as { code?: string };

        assert.equal(response.status, 403);
        assert.equal(body.code, "TRADE_TX_ORIGIN_REJECTED");
      },
    );
  });

  test("useTensorCancelBid calls cancel-bid BFF with bidStateAddress", () => {
    const hook = readSource("components/trade/tensor/use-tensor-cancel-bid.ts");
    assert.match(hook, /\/api\/trade\/tx\/cancel-bid/);
    assert.match(hook, /fetchTensorTxRoute/);
    assert.match(hook, /bidStateAddress/);
    assert.match(hook, /signAndSendTensorTransactions/);
    assert.match(hook, /data\.txs/);
  });

  test("collection-stats proxies Tensor collections endpoint", async () => {
    await withTemporaryEnv(
      {
        TENSOR_API_KEY: "test-key",
        TENSOR_API_BASE_URL: "https://api.example.test",
      },
      async () => {
        globalThis.fetch = async (input) => {
          const url = String(input);
          assert.match(url, /collections/);
          assert.match(url, /slugs=collector_crypt/);
          return new Response(
            JSON.stringify({ collections: [{ slug: "collector_crypt" }] }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        };

        const response = await collectionStatsGet(
          new Request(
            "http://localhost/api/trade/collection-stats?collectionSlug=collector_crypt",
          ),
        );
        const body = (await response.json()) as { collections: unknown[] };

        assert.equal(response.status, 200);
        assert.equal(body.collections.length, 1);
      },
    );
  });

  test("collection-listings proxies mint/collection with sortBy and mint filter", async () => {
    await withTemporaryEnv(
      {
        TENSOR_API_KEY: "test-key",
        TENSOR_API_BASE_URL: "https://api.example.test",
      },
      async () => {
        let requestedUrl = "";
        globalThis.fetch = async (input) => {
          requestedUrl = String(input);
          return new Response(JSON.stringify({ mints: [] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        };

        const mint = Keypair.generate().publicKey.toBase58();
        const response = await collectionListingsGet(
          new Request(
            `http://localhost/api/trade/collection-listings?collectionSlug=cc&limit=25&mint=${mint}`,
          ),
        );

        assert.equal(response.status, 200);
        assert.match(requestedUrl, /mint\/collection/);
        assert.match(requestedUrl, /sortBy=ListingPriceAsc/);
        assert.match(requestedUrl, /mints=/);
      },
    );
  });

  test("collection-stats returns 503 without API key", async () => {
    await withTemporaryEnv({ TENSOR_API_KEY: undefined }, async () => {
      const response = await collectionStatsGet(
        new Request(
          "http://localhost/api/trade/collection-stats?collectionSlug=collector_crypt",
        ),
      );
      assert.equal(response.status, 503);
    });
  });

  test("collection-bids returns unconfigured payload without API key", async () => {
    await withTemporaryEnv({ TENSOR_API_KEY: undefined }, async () => {
      const response = await collectionBidsGet(
        new Request("http://localhost/api/trade/collection-bids?slug=collector-crypt"),
      );
      const body = (await response.json()) as {
        configured: boolean;
        bids: unknown[];
      };

      assert.equal(response.status, 200);
      assert.equal(body.configured, false);
      assert.equal(body.bids.length, 0);
    });
  });

  test("collection-bids proxies Tensor collections/collection_bids", async () => {
    await withTemporaryEnv(
      {
        TENSOR_API_KEY: "test-key",
        TENSOR_API_BASE_URL: "https://api.example.test",
      },
      async () => {
        let requestedUrl = "";
        globalThis.fetch = async (input) => {
          requestedUrl = String(input);
          if (requestedUrl.includes("/api/v1/collections?")) {
            return new Response(
              JSON.stringify({
                collections: [{ collId: "coll-xyz", slug: "collector_crypt" }],
              }),
              { status: 200, headers: { "content-type": "application/json" } },
            );
          }
          if (requestedUrl.includes("collections/collection_bids")) {
            return new Response(
              JSON.stringify({
                bids: [
                  {
                    bidState: "Bid111111111111111111111111111111111111111",
                    owner: "Owner1111111111111111111111111111111111111",
                    price: 2_500_000_000,
                    quantity: 3,
                    blockTime: 1_700_000_000,
                  },
                ],
              }),
              { status: 200, headers: { "content-type": "application/json" } },
            );
          }
          return new Response(JSON.stringify({ bids: [] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        };

        const response = await collectionBidsGet(
          new Request("http://localhost/api/trade/collection-bids?slug=collector-crypt"),
        );
        const body = (await response.json()) as {
          configured: boolean;
          collId: string;
          bids: Array<{ priceSol: number; quantity: number }>;
        };

        assert.equal(response.status, 200);
        assert.equal(body.configured, true);
        assert.equal(body.collId, "coll-xyz");
        assert.equal(body.bids.length, 1);
        assert.equal(body.bids[0]?.priceSol, 2.5);
        assert.equal(body.bids[0]?.quantity, 3);
        assert.match(requestedUrl, /collections\/collection_bids/);
        assert.match(requestedUrl, /collId=coll-xyz/);
      },
    );
  });

  test("wallet bids route validates owner param", async () => {
    const response = await walletBidsGet(
      new Request("http://localhost/api/trade/wallet/bids"),
    );
    assert.equal(response.status, 400);
  });

  test("wallet bids route returns unconfigured without API key", async () => {
    await withTemporaryEnv({ TENSOR_API_KEY: undefined }, async () => {
      const owner = Keypair.generate().publicKey.toBase58();
      const response = await walletBidsGet(
        new Request(`http://localhost/api/trade/wallet/bids?owner=${owner}`),
      );
      const body = (await response.json()) as { configured: boolean; bids: unknown[] };
      assert.equal(response.status, 200);
      assert.equal(body.configured, false);
      assert.equal(body.bids.length, 0);
    });
  });

  test("wallet bids route proxies Tensor user nft and collection bid endpoints", async () => {
    await withTemporaryEnv(
      {
        TENSOR_API_KEY: "test-key",
        TENSOR_API_BASE_URL: "https://api.example.test",
      },
      async () => {
        const requestedUrls: string[] = [];
        globalThis.fetch = async (input) => {
          const url = String(input);
          requestedUrls.push(url);
          if (url.includes("user/nft_bids")) {
            return new Response(
              JSON.stringify({
                bids: [
                  {
                    address: "BidNft111111111111111111111111111111111111",
                    mint: "Mint111111111111111111111111111111111111",
                    name: "Slab #1",
                    price: 1_500_000_000,
                  },
                ],
              }),
              { status: 200, headers: { "content-type": "application/json" } },
            );
          }
          if (url.includes("user/collection_bids")) {
            return new Response(
              JSON.stringify({
                bids: [
                  {
                    bidState: "BidColl111111111111111111111111111111111111",
                    collId: "coll-abc",
                    collectionName: "CC",
                    price: 2_000_000_000,
                  },
                ],
              }),
              { status: 200, headers: { "content-type": "application/json" } },
            );
          }
          return new Response(JSON.stringify({ bids: [] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        };

        const owner = Keypair.generate().publicKey.toBase58();
        const response = await walletBidsGet(
          new Request(`http://localhost/api/trade/wallet/bids?owner=${owner}`),
        );
        const body = (await response.json()) as {
          configured: boolean;
          bids: Array<{ bidStateAddress: string; bidType: string }>;
        };

        assert.equal(response.status, 200);
        assert.equal(body.configured, true);
        assert.equal(body.bids.length, 2);
        assert.ok(requestedUrls.some((url) => url.includes("user/nft_bids")));
        assert.ok(requestedUrls.some((url) => url.includes("user/collection_bids")));
      },
    );
  });
});

describe("tensor buy client query", () => {
  test("buildTensorDelistTxSearchParams always sets writePath=sdk", async () => {
    const { buildTensorDelistTxSearchParams } = await import(
      "@/components/trade/tensor/use-tensor-delist"
    );
    const owner = Keypair.generate().publicKey.toBase58();
    const mint = Keypair.generate().publicKey.toBase58();

    const params = buildTensorDelistTxSearchParams({ owner, mint });
    assert.equal(params.get("writePath"), "sdk");
    assert.equal(params.get("owner"), owner);
    assert.equal(params.get("mint"), mint);
  });

  test("buildTensorBuyTxSearchParams always sets writePath=sdk", async () => {
    const { buildTensorBuyTxSearchParams } = await import(
      "@/components/trade/tensor/use-tensor-buy"
    );
    const buyer = Keypair.generate().publicKey.toBase58();
    const mint = Keypair.generate().publicKey.toBase58();
    const owner = Keypair.generate().publicKey.toBase58();
    const listState = Keypair.generate().publicKey.toBase58();

    const withOwner = buildTensorBuyTxSearchParams({
      buyer,
      mint,
      maxPrice: "1000000000",
      owner,
    });
    assert.equal(withOwner.get("writePath"), "sdk");
    assert.equal(withOwner.get("owner"), owner);
    assert.equal(withOwner.get("listState"), null);

    const withListState = buildTensorBuyTxSearchParams({
      buyer,
      mint,
      maxPrice: "1000000000",
      listState,
    });
    assert.equal(withListState.get("writePath"), "sdk");
    assert.equal(withListState.get("listState"), listState);
  });

  test("buildTensorListTxSearchParams always sets writePath=sdk", async () => {
    const { buildTensorListTxSearchParams } = await import(
      "@/components/trade/tensor/use-tensor-list"
    );
    const owner = Keypair.generate().publicKey.toBase58();
    const mint = Keypair.generate().publicKey.toBase58();
    const price = "2000000000";

    const params = buildTensorListTxSearchParams({ owner, mint, price });
    assert.equal(params.get("writePath"), "sdk");
    assert.equal(params.get("owner"), owner);
    assert.equal(params.get("mint"), mint);
    assert.equal(params.get("price"), price);
  });
});

describe("tensor-tx-bff helpers", () => {
  test("resolveBuyWritePath prefers REST when API key configured", () => {
    withTemporaryEnv({ TENSOR_API_KEY: "key" }, () => {
      assert.equal(resolveBuyWritePath(null), "tensor_rest");
      assert.equal(resolveBuyWritePath("sdk"), "sdk");
      assert.equal(resolveBuyWritePath("rest"), "tensor_rest");
    });
  });

  test("resolveListWritePath mirrors buy REST vs SDK selection", () => {
    withTemporaryEnv({ TENSOR_API_KEY: "key" }, () => {
      assert.equal(resolveListWritePath(null), "tensor_rest");
      assert.equal(resolveListWritePath("sdk"), "sdk");
      assert.equal(resolveListWritePath("tensor_rest"), "tensor_rest");
      assert.equal(resolveListWritePath("rest"), "tensor_rest");
    });
    withTemporaryEnv({ TENSOR_API_KEY: undefined }, () => {
      assert.equal(resolveListWritePath(null), "sdk");
    });
  });

  test("TensorTradeWriteDisabledError uses 503 status", () => {
    const error = new TensorTradeWriteDisabledError();
    assert.equal(error.status, 503);
    assert.match(error.message, /TENSOR_TRADE_WRITE_ENABLED/);
  });
});

test("onchain registry includes multichain preview collections", async () => {
  const { SLABVAULT_TRADE_COLLECTIONS } = await import("@/lib/onchain/collections");
  const slugs = SLABVAULT_TRADE_COLLECTIONS.map((c) => c.slug);
  assert.ok(slugs.includes("beezie"));
  assert.ok(slugs.includes("courtyard"));
  assert.ok(SLABVAULT_TRADE_COLLECTIONS.some((c) => c.chain === "base"));
  assert.ok(SLABVAULT_TRADE_COLLECTIONS.some((c) => c.chain === "polygon"));
});
