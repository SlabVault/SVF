import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, test } from "node:test";

import { LAUNCH_APP_CTA, LAUNCH_APP_HREF } from "@/lib/brand";
import {
  getLaunchAppNav,
  getPrimaryNav,
  getPublicNav,
  getPublicNavStructure,
  GRAILS_APP,
  INTERNAL_NAV,
  LAUNCH_APP_NAV,
} from "@/lib/nav";
import { TRADE_ROUTES } from "@/lib/trade-routes";
import { VAULT_ROUTES } from "@/lib/vault-routes";

const ROOT = process.cwd();

function read(relPath: string) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

const previousTrade = process.env.TRADE_PLATFORM_ENABLED;
const previousRwaTrade = process.env.RWA_TRADE_ENABLED;
const previousNodeEnv = process.env.NODE_ENV;

function resetEnv() {
  if (previousTrade === undefined) {
    delete process.env.TRADE_PLATFORM_ENABLED;
  } else {
    process.env.TRADE_PLATFORM_ENABLED = previousTrade;
  }

  if (previousRwaTrade === undefined) {
    delete process.env.RWA_TRADE_ENABLED;
  } else {
    process.env.RWA_TRADE_ENABLED = previousRwaTrade;
  }

  process.env.NODE_ENV = previousNodeEnv;
}

beforeEach(() => {
  delete process.env.TRADE_PLATFORM_ENABLED;
  delete process.env.RWA_TRADE_ENABLED;
  process.env.NODE_ENV = "production";
});

afterEach(resetEnv);

test("getPrimaryNav always includes Home, Vault, and Pulls without inline trade link", () => {
  process.env.TRADE_PLATFORM_ENABLED = "true";
  const primary = getPrimaryNav();
  const labels = primary.map((item) => item.label);
  assert.ok(labels.includes("Home"));
  assert.ok(labels.includes("Vault"));
  assert.ok(labels.includes("Pulls"));
  assert.equal(primary[0]?.href, "/");
  assert.ok(primary.some((item) => item.href === VAULT_ROUTES.overview));
  assert.ok(!primary.some((item) => item.href === "/trade"));
});

test("getPrimaryNav includes story descriptions for mobile menu", () => {
  const primary = getPrimaryNav();
  const vault = primary.find((item) => item.href === VAULT_ROUTES.overview);
  assert.ok(vault?.description?.includes("treasury"));
});

test("getLaunchAppNav returns Explore GRAILS when trade flag is enabled", () => {
  process.env.TRADE_PLATFORM_ENABLED = "true";
  assert.deepEqual(getLaunchAppNav(), LAUNCH_APP_NAV);
  assert.equal(LAUNCH_APP_NAV.href, LAUNCH_APP_HREF);
  assert.equal(LAUNCH_APP_NAV.label, LAUNCH_APP_CTA);
  assert.match(LAUNCH_APP_NAV.description ?? "", /multi-venue|aggregat/i);
  assert.match(GRAILS_APP.description, /CC|Phygitals|treasury/i);
});

test("INTERNAL_NAV includes aggregate all-listings route for sitemap", () => {
  const hrefs = INTERNAL_NAV.map((item) => item.href);
  assert.ok(hrefs.includes(TRADE_ROUTES.all));
});

test("getLaunchAppNav is null when trade flag is off in production", () => {
  process.env.TRADE_PLATFORM_ENABLED = "false";
  assert.equal(getLaunchAppNav(), null);
});

test("getPublicNavStructure exposes Home, Vault, Pulls + More (trade via Explore GRAILS CTA)", () => {
  process.env.TRADE_PLATFORM_ENABLED = "true";

  const { primary, more } = getPublicNavStructure();
  const primaryHrefs = primary.map((item) => item.href);

  assert.deepEqual(primaryHrefs, ["/", VAULT_ROUTES.overview, "/pulls"]);
  assert.ok(more.some((item) => item.href === "/streams"));
  assert.ok(more.some((item) => item.href === "/faq"));
  assert.ok(!more.some((item) => item.href === "/"));
  assert.ok(!primary.some((item) => item.href === "/trade"));
});

test("getPublicNav never includes discover or archived shop routes", () => {
  process.env.TRADE_PLATFORM_ENABLED = "true";

  const flat = getPublicNav();
  const hrefs = flat.map((item) => item.href);
  assert.equal(new Set(hrefs).size, hrefs.length);
  assert.ok(hrefs.includes(VAULT_ROUTES.overview));
  assert.ok(hrefs.includes("/pulls"));
  assert.ok(!hrefs.includes("/discover"));
  assert.ok(!hrefs.includes(VAULT_ROUTES.shop));
  assert.ok(!hrefs.includes(VAULT_ROUTES.purchases));
  assert.ok(!hrefs.includes("/marketplace"));
  assert.ok(!hrefs.includes("/trade"));
});

test("INTERNAL_NAV retains sitemap routes without discover or archived shop paths", () => {
  const hrefs = INTERNAL_NAV.map((item) => item.href);
  assert.ok(hrefs.includes("/vault"));
  assert.ok(hrefs.includes("/pulls"));
  assert.ok(hrefs.includes("/trade"));
  assert.ok(!hrefs.includes("/discover"));
  assert.ok(!hrefs.includes("/marketplace"));
  assert.ok(!hrefs.includes(VAULT_ROUTES.shop));
});

test("IA chain Home→Trade→Vault→All listings: canonical routes wired", () => {
  const hero = read("components/hero-section.tsx");
  const homeCta = read("components/home-trade-cta.tsx");
  const appHeader = read("components/trade/trade-app-header.tsx");
  const footer = read("components/site-footer.tsx");
  const vaultHero = read("components/vault-hero-section.tsx");
  const valueHero = read("components/trade/trade-landing-value-hero.tsx");

  // Home: vault-first story + trade entry (GRAILS + aggregate desk)
  assert.match(hero, /Explore the vault/);
  assert.match(hero, /Explore GRAILS/);
  assert.match(homeCta, /Browse all listings/);
  assert.match(homeCta, new RegExp(`href=\\{TRADE_ROUTES\\.all\\}`));

  // Trade desk: aggregate + vault back-links (no marketing dead-end)
  assert.match(appHeader, /All listings/);
  assert.match(appHeader, /Vault/);
  assert.match(appHeader, new RegExp('href="/"'));
  assert.match(appHeader, new RegExp(`href=\\{TRADE_ROUTES\\.all\\}`));
  assert.match(appHeader, new RegExp(`href=\\{VAULT_ROUTES\\.overview\\}`));
  assert.match(valueHero, /Browse all listings/);

  // Vault → Trade
  assert.match(vaultHero, /Explore GRAILS/);
  assert.match(vaultHero, new RegExp(`href=\\{LAUNCH_APP_HREF\\}`));

  // Footer platform column: Home · Vault · GRAILS · All listings
  assert.match(footer, /Platform/);
  assert.match(footer, new RegExp(`href=\\{TRADE_ROUTES\\.all\\}`));
  assert.match(footer, new RegExp(`href=\\{VAULT_ROUTES\\.overview\\}`));
  assert.match(footer, new RegExp(`href=\\{LAUNCH_APP_HREF\\}`));

  const internalHrefs = INTERNAL_NAV.map((item) => item.href);
  assert.ok(internalHrefs.includes("/"));
  assert.ok(internalHrefs.includes("/trade"));
  assert.ok(internalHrefs.includes(TRADE_ROUTES.all));
  assert.ok(internalHrefs.includes(VAULT_ROUTES.overview));
});
