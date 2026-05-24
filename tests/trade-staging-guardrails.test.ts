import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { Keypair } from "@solana/web3.js";

import { GET as buyGet } from "@/app/api/trade/tx/buy/route";
import { apiWriteRequest, withTemporaryEnv } from "./helpers/test-helpers";

const ROOT = process.cwd();

/** Machine-readable prod write-off contract (oc-bg / api-errors envelope). */
const PROD_WRITE_OFF = {
  code: "TRADE_WRITE_DISABLED",
  tradeWriteEnabled: false,
} as const;

function read(relPath: string): string {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

function envExampleLines(): string[] {
  return read(".env.example").split(/\r?\n/);
}

/** Match commented or uncommented KEY=value lines in .env.example. */
function findEnvExampleAssignment(name: string): string | null {
  const re = new RegExp(`^#?\\s*${name}\\s*=\\s*(.*)$`);
  for (const line of envExampleLines()) {
    const match = line.match(re);
    if (match) return match[1]?.trim() ?? "";
  }
  return null;
}

test(".env.example keeps TENSOR_TRADE_WRITE_ENABLED=false (prod default)", () => {
  const value = findEnvExampleAssignment("TENSOR_TRADE_WRITE_ENABLED");
  assert.notEqual(
    value,
    null,
    ".env.example must document TENSOR_TRADE_WRITE_ENABLED",
  );
  assert.equal(
    value,
    "false",
    "TENSOR_TRADE_WRITE_ENABLED must default to false in .env.example",
  );
});

test(".env.example keeps NEXT_PUBLIC_TENSOR_TRADE_WRITE_ENABLED=false (client mirror)", () => {
  const value = findEnvExampleAssignment("NEXT_PUBLIC_TENSOR_TRADE_WRITE_ENABLED");
  assert.notEqual(
    value,
    null,
    ".env.example must document NEXT_PUBLIC_TENSOR_TRADE_WRITE_ENABLED",
  );
  assert.equal(
    value,
    "false",
    "NEXT_PUBLIC_TENSOR_TRADE_WRITE_ENABLED must default to false in .env.example",
  );
});

test("buy route returns machine-readable TRADE_WRITE_DISABLED when write off (prod default)", async () => {
  const buyer = Keypair.generate().publicKey.toBase58();
  const mint = Keypair.generate().publicKey.toBase58();
  const owner = Keypair.generate().publicKey.toBase58();

  await withTemporaryEnv(
    {
      TENSOR_TRADE_WRITE_ENABLED: "false",
      TENSOR_TX_REQUIRE_TRUSTED_ORIGIN: undefined,
      TRADE_TX_REQUIRE_WALLET_CHALLENGE: "false",
    },
    async () => {
      const response = await buyGet(
        apiWriteRequest(
          `http://localhost/api/trade/tx/buy?buyer=${buyer}&mint=${mint}&owner=${owner}&maxPrice=1000000000`,
        ),
      );
      const body = (await response.json()) as {
        ok?: boolean;
        code?: string;
        error?: string;
        details?: { tradeWriteEnabled?: boolean };
        requestId?: string;
        timestamp?: string;
        path?: string;
        recoveryHint?: string;
      };

      assert.equal(response.status, 503);
      assert.match(String(body.error ?? ""), /TENSOR_TRADE_WRITE_ENABLED/);

      if (body.code != null) {
        assert.equal(body.ok, false, "structured write-off must set ok: false");
        assert.equal(body.code, PROD_WRITE_OFF.code);
        assert.equal(body.details?.tradeWriteEnabled, PROD_WRITE_OFF.tradeWriteEnabled);
        assert.equal(typeof body.requestId, "string");
        assert.equal(typeof body.timestamp, "string");
        assert.equal(body.path, "/api/trade/tx/buy");
        assert.match(String(body.recoveryHint ?? ""), /staging|partner/i);
      }
    },
  );
});

test(".env.example documents Tensor seller enrichment prerequisites", () => {
  const envExample = read(".env.example");

  assert.match(
    envExample,
    /TENSOR_API_KEY/,
    "TENSOR_API_KEY must be documented for Tensor seller enrichment",
  );
  assert.match(
    envExample,
    /TENSOR_CC_COLLECTION_SLUGS/,
    "TENSOR_CC_COLLECTION_SLUGS must be documented for Tensor seller enrichment",
  );
  assert.match(
    envExample,
    /staging only.*prod must stay false|prod must stay false.*staging only/is,
    "write gate section should warn staging-only / prod off",
  );
});

test("trade-staging-checklist pre-flight mentions Tensor seller enrichment", () => {
  const checklist = read("docs/trade-staging-checklist.md");
  const preFlightSection =
    checklist.split("## Required environment variables")[0] ?? checklist;

  assert.match(
    preFlightSection,
    /Tensor seller enrichment/i,
    "pre-flight must mention Tensor seller enrichment",
  );
  assert.match(
    preFlightSection,
    /tensorEnrichment/,
    "pre-flight should reference tensorEnrichment on partner list responses",
  );
});

test("onchain-trade-stack documents buy BFF query param matrix", () => {
  const doc = read("docs/integrations/onchain-trade-stack.md");

  assert.match(
    doc,
    /buy-bff-buildfilltransaction-query-matrix/,
    "onchain-trade-stack must expose buy BFF anchor for cross-links",
  );
  assert.match(
    doc,
    /Query param matrix/i,
    "onchain-trade-stack must document buy query param matrix",
  );
  assert.match(
    doc,
    /writePath=sdk/,
    "buy matrix must document SDK writePath for M3 dry-run",
  );
  assert.match(
    doc,
    /buildFillTransaction/,
    "buy matrix must reference buildFillTransaction",
  );
  assert.match(
    doc,
    /trade-staging-checklist\.md.*staging-verification-steps/s,
    "buy matrix must cross-link staging verification steps",
  );
});

test("trade-staging-checklist buy dry-run cross-links buy BFF matrix", () => {
  const checklist = read("docs/trade-staging-checklist.md");
  const verificationSection =
    checklist.split("## Staging verification steps")[1]?.split("## Rollback")[0] ??
    checklist;

  assert.match(
    verificationSection,
    /Buy dry-run/i,
    "staging verification must include buy dry-run step",
  );
  assert.match(
    verificationSection,
    /buy-bff-buildfilltransaction-query-matrix/,
    "buy dry-run step must cross-link onchain-trade-stack buy BFF matrix",
  );
});
