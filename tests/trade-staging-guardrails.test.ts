import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();

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
