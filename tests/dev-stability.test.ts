import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();

function read(relPath: string) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

test("dev scripts include clean recovery path", () => {
  const pkg = JSON.parse(read("package.json")) as {
    scripts: Record<string, string>;
  };

  assert.match(pkg.scripts.dev, /--webpack/, "dev should default to webpack for stable .next");
  assert.match(
    pkg.scripts["dev:clean"],
    /clean:next/,
    "dev:clean should wipe .next before starting dev",
  );
  assert.equal(
    existsSync(path.join(ROOT, "scripts/clean-next.ts")),
    true,
    "scripts/clean-next.ts should exist",
  );
});

test("hero wallet CTA avoids SSR wallet hook side-effects", () => {
  const source = read("components/hero-wallet-cta.tsx");

  assert.match(source, /dynamic\(/, "hero wallet CTA should lazy-load wallet hooks");
  assert.match(source, /ssr:\s*false/, "hero wallet CTA should not SSR wallet hooks");
  assert.doesNotMatch(
    source,
    /if\s*\([^)]*\)\s*\{[^}]*setVisible\(/,
    "hero wallet CTA must not call setVisible during render",
  );
});

test("clean-next removes stale locks and webpack cache paths", () => {
  const source = read("scripts/clean-next.ts");

  assert.match(source, /"dev", "cache", "webpack"/);
  assert.match(source, /lock/);
  assert.match(source, /rmWithRetry|rmSync/);
});

test("trade activity panel resets polled feed in useEffect", () => {
  const source = read("components/trade/trade-activity-panel.tsx");

  assert.match(source, /useEffect\(/);
  assert.doesNotMatch(
    source,
    /if\s*\([^)]*\)\s*\{\s*\n\s*setSyncedPropsKey/,
    "trade activity panel must not setState during render when props change",
  );
});

test("next config optimizes heavy Solana package imports", () => {
  const source = read("next.config.ts");

  assert.match(source, /optimizePackageImports/);
  assert.match(source, /@solana\/web3\.js/);
});
