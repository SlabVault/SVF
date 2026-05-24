import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { ed25519 } from "@noble/curves/ed25519";
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";

import { GET as buyGet } from "@/app/api/trade/tx/buy/route";
import { GET as bidGet } from "@/app/api/trade/tx/bid/route";
import { GET as cancelBidGet } from "@/app/api/trade/tx/cancel-bid/route";
import { GET as delistGet } from "@/app/api/trade/tx/delist/route";
import { GET as listGet } from "@/app/api/trade/tx/list/route";
import { GET as tradeChallengeGet } from "@/app/api/trade/tx/challenge/route";
import { __setTensorTcmSdkDepsForTests } from "@/lib/onchain/clients/tensor-tcm-sdk";
import { TENSOR_PROGRAM_IDS } from "@/lib/onchain/program-ids";
import {
  redactTensorApiLeak,
  requireTrustedTensorTxOrigin,
  TensorTradeWriteDisabledError,
} from "@/lib/onchain/tensor-tx-bff";
import {
  issueTradeTxChallenge,
  resetTradeTxChallengesForTests,
} from "@/lib/wallet-challenge";
import {
  apiWriteRequest,
  TRUSTED_LOCAL_ORIGIN,
  withTemporaryEnv,
} from "./helpers/test-helpers";

const originalGetLatestBlockhash = Connection.prototype.getLatestBlockhash;
const MOCK_BLOCKHASH = "11111111111111111111111111111111";
const MOCK_IX = new TransactionInstruction({
  programId: new PublicKey(TENSOR_PROGRAM_IDS.marketplaceTcm),
  keys: [],
  data: Buffer.from([1, 2, 3]),
});

function mockSwapSdk() {
  return {
    buySingleListing: async () => ({
      tx: { ixs: [MOCK_IX], extraSigners: [] },
    }),
  };
}

beforeEach(() => {
  Connection.prototype.getLatestBlockhash = async function () {
    return { blockhash: MOCK_BLOCKHASH, lastValidBlockHeight: 999_999 };
  };
});

afterEach(() => {
  Connection.prototype.getLatestBlockhash = originalGetLatestBlockhash;
  __setTensorTcmSdkDepsForTests(null);
});

function signChallengeMessage(keypair: Keypair, message: string): string {
  const messageBytes = new TextEncoder().encode(message);
  const signature = ed25519.sign(
    messageBytes,
    keypair.secretKey.slice(0, 32),
  );
  return Buffer.from(signature).toString("base64");
}

test("trade tx challenge route issues challenge for valid wallet", async () => {
  const wallet = Keypair.generate().publicKey.toBase58();
  const response = await tradeChallengeGet(
    new Request(`http://localhost/api/trade/tx/challenge?wallet=${wallet}`),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(typeof body.challengeId, "string");
  assert.match(String(body.message), /SlabVaultFi trade tx/);
});

test("buy route requires wallet challenge when enabled", async () => {
  const keypair = Keypair.generate();
  const buyer = keypair.publicKey.toBase58();
  const mint = Keypair.generate().publicKey.toBase58();
  const owner = Keypair.generate().publicKey.toBase58();

  await withTemporaryEnv(
    {
      TENSOR_TRADE_WRITE_ENABLED: "true",
      TRADE_TX_REQUIRE_WALLET_CHALLENGE: "true",
      SOLANA_RPC_URL: "http://127.0.0.1:8899",
    },
    async () => {
      const response = await buyGet(
        new Request(
          `http://localhost/api/trade/tx/buy?buyer=${buyer}&mint=${mint}&owner=${owner}&maxPrice=1000000000&writePath=sdk`,
        ),
      );
      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.code, "TRADE_TX_WALLET_CHALLENGE_REQUIRED");
    },
  );
});

test("list route requires wallet challenge when enabled", async () => {
  const owner = Keypair.generate().publicKey.toBase58();
  const mint = Keypair.generate().publicKey.toBase58();

  await withTemporaryEnv(
    {
      TENSOR_TRADE_WRITE_ENABLED: "true",
      TRADE_TX_REQUIRE_WALLET_CHALLENGE: "true",
      SOLANA_RPC_URL: "http://127.0.0.1:8899",
    },
    async () => {
      const response = await listGet(
        new Request(
          `http://localhost/api/trade/tx/list?owner=${owner}&mint=${mint}&price=1000000000&writePath=sdk`,
        ),
      );
      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.code, "TRADE_TX_WALLET_CHALLENGE_REQUIRED");
    },
  );
});

test("buy route accepts signed challenge before building tx", async () => {
  resetTradeTxChallengesForTests();

  const keypair = Keypair.generate();
  const buyer = keypair.publicKey.toBase58();
  const mint = Keypair.generate().publicKey.toBase58();
  const owner = Keypair.generate().publicKey.toBase58();
  await withTemporaryEnv(
    {
      TENSOR_TRADE_WRITE_ENABLED: "true",
      TRADE_TX_REQUIRE_WALLET_CHALLENGE: "true",
      NODE_ENV: "test",
      NEXT_PUBLIC_SITE_URL: TRUSTED_LOCAL_ORIGIN,
      SOLANA_RPC_URL: "http://127.0.0.1:8899",
    },
    async () => {
      const challenge = issueTradeTxChallenge(buyer);
      const walletSignature = signChallengeMessage(keypair, challenge.message);
      __setTensorTcmSdkDepsForTests({ swapSdk: mockSwapSdk() });

      const response = await buyGet(
        apiWriteRequest(
          `http://localhost/api/trade/tx/buy?buyer=${buyer}&mint=${mint}&owner=${owner}&maxPrice=1000000000&writePath=sdk&challengeId=${challenge.challengeId}&walletSignature=${encodeURIComponent(walletSignature)}`,
        ),
      );
      const body = (await response.json()) as { writePath?: string; code?: string };

      assert.equal(response.status, 200);
      assert.equal(body.writePath, "sdk");
    },
  );
});

test("bid route requires wallet challenge when enabled", async () => {
  const owner = Keypair.generate().publicKey.toBase58();
  const mint = Keypair.generate().publicKey.toBase58();

  await withTemporaryEnv(
    {
      TENSOR_TRADE_WRITE_ENABLED: "true",
      TRADE_TX_REQUIRE_WALLET_CHALLENGE: "true",
      SOLANA_RPC_URL: "http://127.0.0.1:8899",
    },
    async () => {
      const response = await bidGet(
        apiWriteRequest(
          `http://localhost/api/trade/tx/bid?owner=${owner}&mint=${mint}&price=1000000000`,
        ),
      );
      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.code, "TRADE_TX_WALLET_CHALLENGE_REQUIRED");
    },
  );
});

test("delist route requires wallet challenge when enabled", async () => {
  const owner = Keypair.generate().publicKey.toBase58();
  const mint = Keypair.generate().publicKey.toBase58();

  await withTemporaryEnv(
    {
      TENSOR_TRADE_WRITE_ENABLED: "true",
      TRADE_TX_REQUIRE_WALLET_CHALLENGE: "true",
      SOLANA_RPC_URL: "http://127.0.0.1:8899",
    },
    async () => {
      const response = await delistGet(
        apiWriteRequest(
          `http://localhost/api/trade/tx/delist?owner=${owner}&mint=${mint}`,
        ),
      );
      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.code, "TRADE_TX_WALLET_CHALLENGE_REQUIRED");
    },
  );
});

test("cancel-bid route requires owner when wallet challenge enabled", async () => {
  const bidStateAddress = Keypair.generate().publicKey.toBase58();

  await withTemporaryEnv(
    {
      TENSOR_TRADE_WRITE_ENABLED: "true",
      TRADE_TX_REQUIRE_WALLET_CHALLENGE: "true",
      SOLANA_RPC_URL: "http://127.0.0.1:8899",
    },
    async () => {
      const response = await cancelBidGet(
        apiWriteRequest(
          `http://localhost/api/trade/tx/cancel-bid?bidStateAddress=${bidStateAddress}`,
        ),
      );
      const body = await response.json();

      assert.equal(response.status, 400);
      assert.match(String(body.error ?? ""), /owner is required/i);
    },
  );
});

test("cancel-bid route requires wallet challenge when enabled", async () => {
  const keypair = Keypair.generate();
  const owner = keypair.publicKey.toBase58();
  const bidStateAddress = Keypair.generate().publicKey.toBase58();

  await withTemporaryEnv(
    {
      TENSOR_TRADE_WRITE_ENABLED: "true",
      TRADE_TX_REQUIRE_WALLET_CHALLENGE: "true",
      SOLANA_RPC_URL: "http://127.0.0.1:8899",
    },
    async () => {
      const response = await cancelBidGet(
        apiWriteRequest(
          `http://localhost/api/trade/tx/cancel-bid?bidStateAddress=${bidStateAddress}&owner=${owner}`,
        ),
      );
      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.code, "TRADE_TX_WALLET_CHALLENGE_REQUIRED");
    },
  );
});

test("cancel-bid route accepts signed challenge before proxying Tensor REST", async () => {
  resetTradeTxChallengesForTests();

  const keypair = Keypair.generate();
  const owner = keypair.publicKey.toBase58();
  const bidStateAddress = Keypair.generate().publicKey.toBase58();
  const originalFetch = globalThis.fetch;

  await withTemporaryEnv(
    {
      TENSOR_TRADE_WRITE_ENABLED: "true",
      TRADE_TX_REQUIRE_WALLET_CHALLENGE: "true",
      TENSOR_API_KEY: "guard-test-key",
      TENSOR_API_BASE_URL: "https://api.tensor-guardrail.test",
      NODE_ENV: "test",
      NEXT_PUBLIC_SITE_URL: TRUSTED_LOCAL_ORIGIN,
      SOLANA_RPC_URL: "http://127.0.0.1:8899",
    },
    async () => {
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ txs: [{ txV0: "cancel-bid-tx" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });

      try {
        const challenge = issueTradeTxChallenge(owner);
        const walletSignature = signChallengeMessage(keypair, challenge.message);

        const response = await cancelBidGet(
          apiWriteRequest(
            `http://localhost/api/trade/tx/cancel-bid?bidStateAddress=${bidStateAddress}&owner=${owner}&challengeId=${challenge.challengeId}&walletSignature=${encodeURIComponent(walletSignature)}`,
          ),
        );
        const body = (await response.json()) as { txs?: Array<{ txV0?: string }> };

        assert.equal(response.status, 200);
        assert.equal(body.txs?.[0]?.txV0, "cancel-bid-tx");
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  );
});

test("buy route returns 503 when write disabled before wallet challenge", async () => {
  const buyer = Keypair.generate().publicKey.toBase58();
  const mint = Keypair.generate().publicKey.toBase58();
  const owner = Keypair.generate().publicKey.toBase58();

  await withTemporaryEnv(
    {
      TENSOR_TX_REQUIRE_TRUSTED_ORIGIN: undefined,
      TENSOR_TRADE_WRITE_ENABLED: "false",
      TRADE_TX_REQUIRE_WALLET_CHALLENGE: "false",
      SOLANA_RPC_URL: "http://127.0.0.1:8899",
    },
    async () => {
      const response = await buyGet(
        apiWriteRequest(
          `http://localhost/api/trade/tx/buy?buyer=${buyer}&mint=${mint}&owner=${owner}&maxPrice=1000000000`,
        ),
      );
      const body = await response.json();

      assert.equal(response.status, 503);
      assert.match(String(body.error ?? ""), /TENSOR_TRADE_WRITE_ENABLED/);
    },
  );
});

test("requireTrustedTensorTxOrigin is off unless env enabled", () => {
  withTemporaryEnv({ TENSOR_TX_REQUIRE_TRUSTED_ORIGIN: undefined }, () => {
    const request = new Request("http://localhost/api/trade/tx/buy", {
      headers: { origin: "https://evil.com" },
    });
    assert.equal(requireTrustedTensorTxOrigin(request), null);
  });
});

test("requireTrustedTensorTxOrigin rejects untrusted origin when enabled", async () => {
  await withTemporaryEnv(
    {
      TENSOR_TX_REQUIRE_TRUSTED_ORIGIN: "true",
      NEXT_PUBLIC_SITE_URL: "https://slabvault.xyz",
      NODE_ENV: "production",
    },
    async () => {
      const request = new Request("http://localhost/api/trade/tx/buy", {
        headers: { origin: "https://evil.com" },
      });
      const response = requireTrustedTensorTxOrigin(request);
      assert.ok(response);
      assert.equal(response.status, 403);
      const body = (await response.json()) as { code?: string };
      assert.equal(body.code, "TRADE_TX_ORIGIN_REJECTED");
      assert.notEqual(body.code, "CSRF_ORIGIN_REJECTED");
    },
  );
});

test("requireTrustedTensorTxOrigin accepts trusted site origin when enabled", () => {
  withTemporaryEnv(
    {
      TENSOR_TX_REQUIRE_TRUSTED_ORIGIN: "true",
      NEXT_PUBLIC_SITE_URL: "https://slabvault.xyz",
      NODE_ENV: "production",
    },
    () => {
      const request = new Request("http://localhost/api/trade/tx/buy", {
        headers: { origin: "https://slabvault.xyz" },
      });
      assert.equal(requireTrustedTensorTxOrigin(request), null);
    },
  );
});

test("buy route returns 403 TRADE_TX_ORIGIN_REJECTED for evil.com before write gate", async () => {
  await withTemporaryEnv(
    {
      TENSOR_TX_REQUIRE_TRUSTED_ORIGIN: "true",
      TENSOR_TRADE_WRITE_ENABLED: "false",
      NEXT_PUBLIC_SITE_URL: "https://slabvault.xyz",
      NODE_ENV: "production",
      SOLANA_RPC_URL: "http://127.0.0.1:8899",
    },
    async () => {
      const buyer = Keypair.generate().publicKey.toBase58();
      const mint = Keypair.generate().publicKey.toBase58();
      const owner = Keypair.generate().publicKey.toBase58();
      const params = new URLSearchParams({ buyer, mint, owner, maxPrice: "1000000000" });
      const request = new Request(
        `http://localhost/api/trade/tx/buy?${params.toString()}`,
        { headers: { origin: "https://evil.com" } },
      );

      const response = await buyGet(request);
      const body = (await response.json()) as { code?: string };

      assert.equal(response.status, 403);
      assert.equal(body.code, "TRADE_TX_ORIGIN_REJECTED");
    },
  );
});

test("buy route passes trusted origin then enforces write dry-run", async () => {
  await withTemporaryEnv(
    {
      TENSOR_TX_REQUIRE_TRUSTED_ORIGIN: "true",
      TENSOR_TRADE_WRITE_ENABLED: "false",
      NEXT_PUBLIC_SITE_URL: TRUSTED_LOCAL_ORIGIN,
      NODE_ENV: "test",
      SOLANA_RPC_URL: "http://127.0.0.1:8899",
    },
    async () => {
      const buyer = Keypair.generate().publicKey.toBase58();
      const mint = Keypair.generate().publicKey.toBase58();
      const owner = Keypair.generate().publicKey.toBase58();
      const params = new URLSearchParams({ buyer, mint, owner, maxPrice: "1000000000" });
      const response = await buyGet(
        apiWriteRequest(`http://localhost/api/trade/tx/buy?${params.toString()}`),
      );
      const body = (await response.json()) as { error?: string };

      assert.equal(response.status, 503);
      assert.match(body.error ?? "", /TENSOR_TRADE_WRITE_ENABLED/);
    },
  );
});

test("list route rejects untrusted cross-origin GET when origin gate on", async () => {
  await withTemporaryEnv(
    {
      TENSOR_TX_REQUIRE_TRUSTED_ORIGIN: "true",
      TENSOR_TRADE_WRITE_ENABLED: "false",
      NEXT_PUBLIC_SITE_URL: "https://slabvault.xyz",
      NODE_ENV: "production",
      SOLANA_RPC_URL: "http://127.0.0.1:8899",
    },
    async () => {
      const owner = Keypair.generate().publicKey.toBase58();
      const mint = Keypair.generate().publicKey.toBase58();
      const response = await listGet(
        new Request(
          `http://localhost/api/trade/tx/list?owner=${owner}&mint=${mint}&price=1000000000`,
          { headers: { origin: "https://evil.com" } },
        ),
      );
      const body = (await response.json()) as { code?: string };

      assert.equal(response.status, 403);
      assert.equal(body.code, "TRADE_TX_ORIGIN_REJECTED");
    },
  );
});

test("challenge route rejects untrusted cross-origin GET when origin gate on", async () => {
  await withTemporaryEnv(
    {
      TENSOR_TX_REQUIRE_TRUSTED_ORIGIN: "true",
      NEXT_PUBLIC_SITE_URL: "https://slabvault.xyz",
      NODE_ENV: "production",
    },
    async () => {
      const wallet = Keypair.generate().publicKey.toBase58();
      const response = await tradeChallengeGet(
        new Request(
          `http://localhost/api/trade/tx/challenge?wallet=${wallet}`,
          { headers: { origin: "https://evil.com" } },
        ),
      );
      const body = (await response.json()) as { code?: string };

      assert.equal(response.status, 403);
      assert.equal(body.code, "TRADE_TX_ORIGIN_REJECTED");
    },
  );
});

test("challenge route accepts trusted origin when origin gate on", async () => {
  await withTemporaryEnv(
    {
      TENSOR_TX_REQUIRE_TRUSTED_ORIGIN: "true",
      NEXT_PUBLIC_SITE_URL: TRUSTED_LOCAL_ORIGIN,
      NODE_ENV: "test",
    },
    async () => {
      const wallet = Keypair.generate().publicKey.toBase58();
      const response = await tradeChallengeGet(
        apiWriteRequest(
          `http://localhost/api/trade/tx/challenge?wallet=${wallet}`,
        ),
      );
      const body = (await response.json()) as { challengeId?: string; message?: string };

      assert.equal(response.status, 200);
      assert.equal(typeof body.challengeId, "string");
      assert.match(String(body.message), /SlabVaultFi trade tx/);
    },
  );
});

test("untrusted origin reaches write dry-run when origin gate off", async () => {
  await withTemporaryEnv(
    {
      TENSOR_TX_REQUIRE_TRUSTED_ORIGIN: undefined,
      TENSOR_TRADE_WRITE_ENABLED: "false",
      TRADE_TX_REQUIRE_WALLET_CHALLENGE: "false",
      NEXT_PUBLIC_SITE_URL: "https://slabvault.xyz",
      NODE_ENV: "production",
      SOLANA_RPC_URL: "http://127.0.0.1:8899",
    },
    async () => {
      const owner = Keypair.generate().publicKey.toBase58();
      const mint = Keypair.generate().publicKey.toBase58();
      const params = new URLSearchParams({
        buyer: owner,
        mint,
        owner,
        maxPrice: "1000000000",
      });
      const response = await buyGet(
        new Request(`http://localhost/api/trade/tx/buy?${params.toString()}`, {
          headers: { origin: "https://evil.com" },
        }),
      );
      const body = (await response.json()) as { error?: string; code?: string };

      assert.equal(response.status, 503);
      assert.notEqual(body.code, "TRADE_TX_ORIGIN_REJECTED");
      assert.match(body.error ?? "", /TENSOR_TRADE_WRITE_ENABLED/);
    },
  );
});

test("trade tx routes return 503 when write path disabled", async () => {
  await withTemporaryEnv(
    {
      TENSOR_TRADE_WRITE_ENABLED: "false",
      TRADE_TX_REQUIRE_WALLET_CHALLENGE: "false",
      SOLANA_RPC_URL: "http://127.0.0.1:8899",
    },
    async () => {
      const owner = Keypair.generate().publicKey.toBase58();
      const mint = Keypair.generate().publicKey.toBase58();

      assert.equal(
        (
          await buyGet(
            apiWriteRequest(
              `http://localhost/api/trade/tx/buy?buyer=${owner}&mint=${mint}&owner=${owner}&maxPrice=1000000000`,
            ),
          )
        ).status,
        503,
      );
      assert.equal(
        (
          await listGet(
            apiWriteRequest(
              `http://localhost/api/trade/tx/list?owner=${owner}&mint=${mint}&price=1000000000`,
            ),
          )
        ).status,
        503,
      );
      assert.equal(
        (
          await delistGet(
            apiWriteRequest(`http://localhost/api/trade/tx/delist?owner=${owner}&mint=${mint}`),
          )
        ).status,
        503,
      );
      assert.equal(
        (
          await bidGet(
            apiWriteRequest(
              `http://localhost/api/trade/tx/bid?owner=${owner}&mint=${mint}&price=1000000000`,
            ),
          )
        ).status,
        503,
      );
      assert.equal(
        (
          await cancelBidGet(
            apiWriteRequest(
              `http://localhost/api/trade/tx/cancel-bid?bidStateAddress=${owner}`,
            ),
          )
        ).status,
        503,
      );
    },
  );
});

test("TensorTradeWriteDisabledError documents dry-run gate", () => {
  const error = new TensorTradeWriteDisabledError();
  assert.equal(error.status, 503);
  assert.match(error.message, /TENSOR_TRADE_WRITE_ENABLED/);
});

test("redactTensorApiLeak strips configured API key from error text", () => {
  withTemporaryEnv({ TENSOR_API_KEY: "super-secret-tensor-key-99" }, () => {
    const leaked = redactTensorApiLeak(
      "invalid key super-secret-tensor-key-99 in x-tensor-api-key:super-secret-tensor-key-99",
    );
    assert.doesNotMatch(leaked, /super-secret-tensor-key-99/);
    assert.match(leaked, /\[REDACTED\]/);
  });
});

test("trade tx routes do not leak TENSOR_API_KEY in Tensor REST error responses", async () => {
  const secretKey = "guardrail-tensor-key-do-not-leak";
  const originalFetch = globalThis.fetch;

  await withTemporaryEnv(
    {
      TENSOR_TRADE_WRITE_ENABLED: "true",
      TENSOR_API_KEY: secretKey,
      TENSOR_API_BASE_URL: "https://api.tensor-guardrail.test",
      SOLANA_RPC_URL: "http://127.0.0.1:8899",
      NEXT_PUBLIC_SITE_URL: TRUSTED_LOCAL_ORIGIN,
    },
    async () => {
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            error: `Unauthorized: invalid x-tensor-api-key ${secretKey}`,
          }),
          { status: 401, headers: { "content-type": "application/json" } },
        );

      try {
        const owner = Keypair.generate().publicKey.toBase58();
        const mint = Keypair.generate().publicKey.toBase58();
        const response = await bidGet(
          apiWriteRequest(
            `http://localhost/api/trade/tx/bid?owner=${owner}&mint=${mint}&price=1000000000`,
          ),
        );
        const raw = await response.text();

        assert.notEqual(response.status, 200);
        assert.doesNotMatch(raw, new RegExp(secretKey));
        assert.doesNotMatch(raw, /TENSOR_API_KEY/);
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  );
});

test("trade tx REST-not-configured errors omit TENSOR_API_KEY env name", async () => {
  await withTemporaryEnv(
    {
      TENSOR_TRADE_WRITE_ENABLED: "true",
      TRADE_TX_REQUIRE_WALLET_CHALLENGE: "false",
      TENSOR_API_KEY: undefined,
      SOLANA_RPC_URL: "http://127.0.0.1:8899",
    },
    async () => {
      const owner = Keypair.generate().publicKey.toBase58();
      const mint = Keypair.generate().publicKey.toBase58();
      const restQuery = "writePath=rest";

      for (const run of [
        () =>
          buyGet(
            apiWriteRequest(
              `http://localhost/api/trade/tx/buy?buyer=${owner}&mint=${mint}&owner=${owner}&maxPrice=1000000000&${restQuery}`,
            ),
          ),
        () =>
          listGet(
            apiWriteRequest(
              `http://localhost/api/trade/tx/list?owner=${owner}&mint=${mint}&price=1000000000&${restQuery}`,
            ),
          ),
        () =>
          delistGet(
            apiWriteRequest(
              `http://localhost/api/trade/tx/delist?owner=${owner}&mint=${mint}&${restQuery}`,
            ),
          ),
      ]) {
        const response = await run();
        const raw = await response.text();
        assert.equal(response.status, 503);
        assert.doesNotMatch(raw, /TENSOR_API_KEY/);
        assert.match(raw, /Tensor REST is not configured/);
      }
    },
  );
});

test("TENSOR_TRADE_WRITE_ENABLED=false returns 503 on all 5 tx routes without calling Tensor API", async () => {
  const originalFetch = globalThis.fetch;
  let tensorApiFetchCount = 0;
  const tensorApiBase = "https://api.tensor-guard.test";

  await withTemporaryEnv(
    {
      TENSOR_TRADE_WRITE_ENABLED: "false",
      TENSOR_API_KEY: "guard-test-key",
      TENSOR_API_BASE_URL: tensorApiBase,
      SOLANA_RPC_URL: "http://127.0.0.1:8899",
    },
    async () => {
      globalThis.fetch = async (input) => {
        const url = String(input);
        if (url.startsWith(tensorApiBase)) {
          tensorApiFetchCount += 1;
          throw new Error(
            "Tensor API fetch must not run when TENSOR_TRADE_WRITE_ENABLED=false",
          );
        }
        return originalFetch(input);
      };

      try {
        const owner = Keypair.generate().publicKey.toBase58();
        const mint = Keypair.generate().publicKey.toBase58();
        const restQuery = "writePath=rest";

        const cases: Array<{ name: string; run: () => Promise<Response> }> = [
          {
            name: "buy",
            run: () =>
              buyGet(
                apiWriteRequest(
                  `http://localhost/api/trade/tx/buy?buyer=${owner}&mint=${mint}&owner=${owner}&maxPrice=1000000000&${restQuery}`,
                ),
              ),
          },
          {
            name: "list",
            run: () =>
              listGet(
                apiWriteRequest(
                  `http://localhost/api/trade/tx/list?owner=${owner}&mint=${mint}&price=1000000000&${restQuery}`,
                ),
              ),
          },
          {
            name: "delist",
            run: () =>
              delistGet(
                apiWriteRequest(
                  `http://localhost/api/trade/tx/delist?owner=${owner}&mint=${mint}&${restQuery}`,
                ),
              ),
          },
          {
            name: "bid",
            run: () =>
              bidGet(
                apiWriteRequest(
                  `http://localhost/api/trade/tx/bid?owner=${owner}&mint=${mint}&price=1000000000`,
                ),
              ),
          },
          {
            name: "cancel-bid",
            run: () =>
              cancelBidGet(
                apiWriteRequest(
                  `http://localhost/api/trade/tx/cancel-bid?bidStateAddress=${owner}`,
                ),
              ),
          },
        ];

        for (const { name, run } of cases) {
          const response = await run();
          const body = (await response.json()) as { error?: string };
          assert.equal(
            response.status,
            503,
            `${name} route should return 503 when write disabled`,
          );
          assert.match(
            body.error ?? "",
            /TENSOR_TRADE_WRITE_ENABLED/,
            `${name} route should document write gate`,
          );
        }

        assert.equal(
          tensorApiFetchCount,
          0,
          "Tensor REST proxy must not run when write gate is off",
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  );
});
