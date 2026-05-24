import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();

function read(relPath: string) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

test("slab image and slab card stay server-rendered", () => {
  const slabImage = read("components/slab-image.tsx");
  const slabCard = read("components/slab-card.tsx");

  assert.ok(
    !slabImage.includes('"use client"'),
    "components/slab-image.tsx should not include use client",
  );
  assert.ok(
    !slabCard.includes('"use client"'),
    "components/slab-card.tsx should not include use client",
  );
});

test("marketplace filter remains server-side", () => {
  const filter = read("components/marketplace-status-filter.tsx");

  assert.ok(
    !filter.includes("useSearchParams"),
    "marketplace status filter should not use useSearchParams",
  );
  assert.match(
    filter,
    /currentStatus:\s*"AVAILABLE"\s*\|\s*"SOLD"/,
    "marketplace status filter should accept currentStatus prop",
  );
});

test("marketplace route has loading skeleton", () => {
  const loadingPath = path.join(ROOT, "app/vault/shop/loading.tsx");
  assert.equal(
    existsSync(loadingPath),
    true,
    "app/vault/shop/loading.tsx should exist for route-level streaming fallback",
  );
});

test("vault route has loading skeleton", () => {
  const loadingPath = path.join(ROOT, "app/vault/loading.tsx");
  assert.equal(
    existsSync(loadingPath),
    true,
    "app/vault/loading.tsx should exist for route-level streaming fallback",
  );
});

test("pulls route has loading skeleton", () => {
  const loadingPath = path.join(ROOT, "app/pulls/loading.tsx");
  assert.equal(
    existsSync(loadingPath),
    true,
    "app/pulls/loading.tsx should exist for route-level streaming fallback",
  );
});

test("discover route redirects — no loading skeleton required", () => {
  const loadingPath = path.join(ROOT, "app/discover/loading.tsx");
  assert.equal(
    existsSync(loadingPath),
    false,
    "app/discover/loading.tsx removed — /discover redirects to /trade",
  );
});

test("slab image applies lazy-loading and fetch priority hints", () => {
  const slabImage = read("components/slab-image.tsx");

  assert.match(slabImage, /loading=\{priority \? "eager" : "lazy"\}/);
  assert.match(slabImage, /fetchPriority=\{priority \? "high" : "auto"\}/);
});

test("growth instrumentation is mounted in root layout", () => {
  const layout = read("app/layout.tsx");

  assert.match(layout, /GrowthInstrumentation/);
  assert.match(layout, /buildRootMetadata/);
  assert.doesNotMatch(layout, /<head>/);
});

test("public routes export metadata via buildPageMetadata", () => {
  const publicRoutes = [
    "app/page.tsx",
    "app/vault/page.tsx",
    "app/pulls/page.tsx",
    "app/vault/shop/page.tsx",
    "app/streams/page.tsx",
    "app/svf/page.tsx",
    "app/faq/page.tsx",
    "app/roadmap/page.tsx",
    "app/community/page.tsx",
    "app/vault/proof/page.tsx",
  ];

  for (const routePath of publicRoutes) {
    const source = read(routePath);
    assert.match(
      source,
      /buildPageMetadata/,
      `${routePath} should export metadata via buildPageMetadata`,
    );
  }
});

test("key conversion CTAs include growth event attributes", () => {
  const keyCtaFiles = [
    "components/hero-section.tsx",
    "components/live-pull-board.tsx",
    "components/site-nav.tsx",
    "components/quick-links.tsx",
    "components/slab-detail-client.tsx",
  ];

  for (const filePath of keyCtaFiles) {
    const source = read(filePath);
    assert.match(
      source,
      /data-growth-event|trackingEvent/,
      `${filePath} should instrument primary CTAs for growth analytics`,
    );
  }
});
