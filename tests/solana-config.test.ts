import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import {
  buildHeliusRpcUrl,
  DEFAULT_PUBLIC_SOLANA_RPC,
  getHeliusRpcUrl,
  getSolanaRpcUrl,
  isLikelySolanaRpcError,
  isSolanaRpcExplicitlyConfigured,
  resolveClientSolanaRpcUrl,
  resolveServerSolanaRpcUrl,
  shouldSuppressRpcRejection,
} from "@/lib/solana-config";

const baseEnv = {
  NEXT_PUBLIC_SOLANA_RPC_URL: undefined,
  NEXT_PUBLIC_SOLANA_RPC: undefined,
  SOLANA_RPC_URL: undefined,
  HELIUS_API_KEY: undefined,
  HELIUS_RPC_URL: undefined,
} as NodeJS.ProcessEnv;

test("resolveClientSolanaRpcUrl prefers NEXT_PUBLIC_SOLANA_RPC_URL over legacy name", () => {
  assert.equal(
    resolveClientSolanaRpcUrl({
      ...baseEnv,
      NEXT_PUBLIC_SOLANA_RPC_URL: "https://client.helius.test",
      NEXT_PUBLIC_SOLANA_RPC: "https://legacy.test",
    }),
    "https://client.helius.test",
  );
});

test("resolveClientSolanaRpcUrl falls back to legacy then public default", () => {
  assert.equal(
    resolveClientSolanaRpcUrl({
      ...baseEnv,
      NEXT_PUBLIC_SOLANA_RPC: "https://legacy.test",
    }),
    "https://legacy.test",
  );
  assert.equal(resolveClientSolanaRpcUrl(baseEnv), DEFAULT_PUBLIC_SOLANA_RPC);
});

test("resolveServerSolanaRpcUrl prefers SOLANA_RPC_URL then Helius key", () => {
  assert.equal(
    resolveServerSolanaRpcUrl({
      ...baseEnv,
      SOLANA_RPC_URL: "https://server.test",
      HELIUS_API_KEY: "secret-key",
    }),
    "https://server.test",
  );

  assert.equal(
    resolveServerSolanaRpcUrl({
      ...baseEnv,
      HELIUS_API_KEY: "secret-key",
    }),
    "https://mainnet.helius-rpc.com/?api-key=secret-key",
  );
});

test("buildHeliusRpcUrl honors HELIUS_RPC_URL override", () => {
  assert.equal(
    getHeliusRpcUrl({
      ...baseEnv,
      HELIUS_API_KEY: "secret-key",
      HELIUS_RPC_URL: "https://custom.helius.test",
    }),
    "https://custom.helius.test",
  );
  assert.equal(buildHeliusRpcUrl("abc", "https://override.test"), "https://override.test");
});

test("getSolanaRpcUrl resolves server-side chain on Node", () => {
  assert.equal(
    getSolanaRpcUrl({
      ...baseEnv,
      SOLANA_RPC_URL: "https://node-server.test",
      NEXT_PUBLIC_SOLANA_RPC_URL: "https://client.test",
    }),
    "https://node-server.test",
  );
});

test("isSolanaRpcExplicitlyConfigured detects any configured source", () => {
  assert.equal(isSolanaRpcExplicitlyConfigured(baseEnv), false);
  assert.equal(
    isSolanaRpcExplicitlyConfigured({ ...baseEnv, HELIUS_API_KEY: "k" }),
    true,
  );
  assert.equal(
    isSolanaRpcExplicitlyConfigured({ ...baseEnv, NEXT_PUBLIC_SOLANA_RPC_URL: "u" }),
    true,
  );
});

test("isLikelySolanaRpcError matches 403 balance failures", () => {
  assert.equal(
    isLikelySolanaRpcError(
      new Error("failed to get balance of account CWqc...: 403 Access forbidden"),
    ),
    true,
  );
  assert.equal(isLikelySolanaRpcError(new Error("user rejected")), false);
  assert.equal(shouldSuppressRpcRejection(new Error("429 Too Many Requests")), true);
});

test("fetchSolBalanceLamports delegates to rpc-cache", () => {
  const source = readFileSync(
    path.join(process.cwd(), "lib/solana-config.ts"),
    "utf8",
  );
  assert.match(source, /fetchCachedSolBalanceLamports/);
  assert.match(
    readFileSync(path.join(process.cwd(), "lib/rpc-cache.ts"), "utf8"),
    /RPC_BALANCE_CACHE_TTL_MS = 60_000/,
  );
  assert.match(
    readFileSync(path.join(process.cwd(), "app/api/trade/wallet/nfts/route.ts"), "utf8"),
    /unstable_cache/,
  );
  assert.match(
    readFileSync(path.join(process.cwd(), "app/api/trade/wallet/nfts/route.ts"), "utf8"),
    /WALLET_NFTS_HTTP_MAX_AGE_SEC = 60/,
  );
  assert.match(
    readFileSync(path.join(process.cwd(), "app/api/trade/wallet/nfts/route.ts"), "utf8"),
    /private, max-age=\$\{WALLET_NFTS_HTTP_MAX_AGE_SEC\}/,
  );
});
