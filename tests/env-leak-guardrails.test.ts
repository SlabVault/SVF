import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();

/** Server-only Tensor env names — must never appear as NEXT_PUBLIC_* (except allowlist). */
const SERVER_ONLY_TENSOR_ENV = [
  "TENSOR_API_KEY",
  "TENSOR_API_BASE_URL",
  "TENSOR_CC_COLLECTION_SLUGS",
  "TENSOR_TRADE_WRITE_ENABLED",
] as const;

/** Client-safe Tensor gate; mirrors server flag without exposing secrets. */
const ALLOWED_NEXT_PUBLIC_TENSOR = new Set(["NEXT_PUBLIC_TENSOR_TRADE_WRITE_ENABLED"]);

const NEXT_PUBLIC_KEY_RE = /^(?:#\s*)?(NEXT_PUBLIC_[A-Z0-9_]+)=/;
const CODE_NEXT_PUBLIC_RE = /process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)/g;

const SCAN_DIRS = ["app", "lib", "components", "scripts"] as const;

function read(relPath: string) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

function collectNextPublicKeysFromEnvFile(relPath: string): string[] {
  const keys = new Set<string>();
  const contents = read(relPath);
  for (const line of contents.split(/\r?\n/)) {
    const match = line.trim().match(NEXT_PUBLIC_KEY_RE);
    if (match) keys.add(match[1]);
  }
  return [...keys];
}

function walkSourceFiles(dirRel: string, out: string[]) {
  const dirAbs = path.join(ROOT, dirRel);
  for (const entry of readdirSync(dirAbs, { withFileTypes: true })) {
    const rel = path.join(dirRel, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(rel, out);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;
    out.push(rel);
  }
}

function collectNextPublicKeysFromSource(): string[] {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) {
    try {
      walkSourceFiles(dir, files);
    } catch {
      // directory may be absent in trimmed workspaces
    }
  }

  const keys = new Set<string>();
  for (const file of files) {
    const source = read(file);
    for (const match of source.matchAll(CODE_NEXT_PUBLIC_RE)) {
      keys.add(match[1]);
    }
  }
  return [...keys];
}

function violationForNextPublicName(name: string): string | null {
  if (ALLOWED_NEXT_PUBLIC_TENSOR.has(name)) return null;
  if (name.includes("TENSOR_API_KEY")) {
    return "must not expose TENSOR_API_KEY via NEXT_PUBLIC_*";
  }
  const suffix = name.slice("NEXT_PUBLIC_".length);
  for (const serverOnly of SERVER_ONLY_TENSOR_ENV) {
    if (suffix === serverOnly) {
      return `must not mirror server-only ${serverOnly}`;
    }
  }
  return null;
}

function assertNoTensorSecretLeak(names: Iterable<string>, context: string) {
  const violations: string[] = [];
  for (const name of names) {
    const reason = violationForNextPublicName(name);
    if (reason) violations.push(`${name} (${context}): ${reason}`);
  }
  assert.equal(
    violations.length,
    0,
    violations.length
      ? `NEXT_PUBLIC_* tensor secret leak:\n${violations.join("\n")}`
      : undefined,
  );
}

test(".env.example does not declare NEXT_PUBLIC_* tensor secrets", () => {
  const keys = collectNextPublicKeysFromEnvFile(".env.example");
  assert.ok(keys.length > 0, ".env.example should declare at least one NEXT_PUBLIC_* key");
  assertNoTensorSecretLeak(keys, ".env.example");
});

test("app source does not reference NEXT_PUBLIC_* tensor secrets", () => {
  const keys = collectNextPublicKeysFromSource();
  assertNoTensorSecretLeak(keys, "source");
});

test("runtime NEXT_PUBLIC_* env does not include tensor secrets", () => {
  const keys = Object.keys(process.env).filter((key) => key.startsWith("NEXT_PUBLIC_"));
  assertNoTensorSecretLeak(keys, "process.env");
});
