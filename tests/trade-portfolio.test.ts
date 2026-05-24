import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  getTradeLandingAggregateFromCollections,
  getTradeLandingCollections,
} from "@/lib/trade-landing";
import {
  parsePortfolioOwnerAddress,
  portfolioOwnerHref,
  PORTFOLIO_OWNER_QUERY,
} from "@/lib/trade/portfolio";
import { TRADE_ROUTES } from "@/lib/trade-routes";

const ROOT = process.cwd();

function read(relPath: string) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

test("TRADE_ROUTES.portfolio resolves /trade/portfolio", () => {
  assert.equal(TRADE_ROUTES.portfolio, "/trade/portfolio");
});

test("trade portfolio page wires TradePortfolioClient behind rwa gate", () => {
  const source = read("app/trade/portfolio/page.tsx");
  assert.match(source, /TradePortfolioClient/);
  assert.match(source, /isRwaTradeEnabled/);
  assert.match(source, /getTradeLandingCollections/);
});

test("TradePortfolioClient uses wallet adapter and tensor portfolio tabs", () => {
  const source = read("components/trade-portfolio-client.tsx");
  assert.match(source, /useWallet\(\)/);
  assert.match(source, /useWalletModal\(\)/);
  assert.match(source, /INVENTORY/);
  assert.match(source, /RECEIVED OFFERS/);
  assert.match(source, /PLACED OFFERS/);
  assert.match(source, /ACTIVITY/);
  assert.match(source, /useWalletOpenBids/);
  assert.match(source, /PortfolioPlacedOffersPanel/);
  assert.match(source, /TradePortfolioEmptyGrid/);
  assert.match(source, /ListForSaleModal/);
  assert.match(source, /TradePortfolioSidebar/);
  assert.match(source, /TradePortfolioSummary/);
  assert.match(source, /TradePortfolioStickyBar/);
  assert.match(source, /TradePortfolioPublicShell/);
  assert.match(source, /PORTFOLIO_OWNER_QUERY/);
  assert.match(source, /effectiveOwner/);
  assert.doesNotMatch(source, /MarketplacePurchasesClient/);
});

test("portfolio public shell: Connect Wallet OR address VIEW (#641ae6)", () => {
  const shell = read("components/trade/portfolio/trade-portfolio-public-shell.tsx");

  assert.match(shell, /Connect Wallet/);
  assert.match(shell, /Enter Wallet Address/);
  assert.match(shell, /tensor-btn-primary/);
  assert.match(shell, />\s*View\s*</i);
  assert.match(shell, />\s*Or\s*</);
});

test("parsePortfolioOwnerAddress and portfolioOwnerHref for VIEW", () => {
  assert.equal(PORTFOLIO_OWNER_QUERY, "owner");
  assert.equal(parsePortfolioOwnerAddress("not-an-address"), null);
  assert.equal(
    parsePortfolioOwnerAddress("11111111111111111111111111111111"),
    "11111111111111111111111111111111",
  );
  assert.equal(
    portfolioOwnerHref("11111111111111111111111111111111"),
    "/trade/portfolio?owner=11111111111111111111111111111111",
  );
  assert.equal(
    portfolioOwnerHref("11111111111111111111111111111111", "placed-offers"),
    "/trade/portfolio?owner=11111111111111111111111111111111&tab=placed-offers",
  );
});

test("portfolio orders & bids tab: table shell without Soon stub", () => {
  const tabs = read("components/trade/portfolio/trade-portfolio-tabs.tsx");
  const client = read("components/trade-portfolio-client.tsx");
  const portfolio = read("lib/trade/portfolio.ts");
  const tabsBlock = portfolio.match(
    /export const PORTFOLIO_TABS = (\[[\s\S]*?\]) as const;/,
  )?.[1];
  assert.ok(tabsBlock, "PORTFOLIO_TABS block");
  assert.match(tabsBlock, /\{ id: "orders-bids", label: "ORDERS & BIDS" \}/);
  assert.doesNotMatch(tabsBlock, /\{ id: "orders-bids", label: "ORDERS & BIDS", soon: true \}/);
  assert.match(tabs, /function TradePortfolioOrdersShell/);
  assert.match(tabs, /aria-label="Portfolio orders"/);
  assert.match(tabs, /No open orders in your portfolio/);
  assert.match(tabs, /All Collections/);
  assert.match(client, /TradePortfolioOrdersShell/);
  assert.match(client, /tab === "orders-bids"/);
});

test("portfolio received offers tab: Soon label in nav and shell", () => {
  const tabs = read("components/trade/portfolio/trade-portfolio-tabs.tsx");
  const client = read("components/trade-portfolio-client.tsx");
  const portfolio = read("lib/trade/portfolio.ts");

  assert.match(portfolio, /id: "received-offers", label: "RECEIVED OFFERS", soon: true/);
  assert.match(tabs, /RECEIVED OFFERS/);
  assert.match(tabs, /Soon/);
  assert.match(tabs, /function TradePortfolioReceivedOffersShell/);
  assert.match(tabs, /TradePortfolioEmptyGrid/);
  assert.match(client, /TradePortfolioReceivedOffersShell/);
  assert.match(client, /tab === "received-offers"/);
});

test("useWalletOpenBids fetches wallet bids BFF", () => {
  const source = read("components/trade/tensor/use-wallet-open-bids.ts");
  assert.match(source, /\/api\/trade\/wallet\/bids/);
  assert.match(source, /mergeSessionWalletBids/);
});

test("TensorTradePanel cancel tab loads wallet bids and per-row cancel", () => {
  const source = read("components/trade/tensor/trade-panel.tsx");
  assert.match(source, /useWalletOpenBids/);
  assert.match(source, /useTensorCancelBid/);
  assert.match(source, /buyTab === "cancel"/);
  assert.match(
    source,
    /const collectionMints = useMemo[\s\S]*resolveTradeListingMint\(listing\)/,
  );
});

test("TradeDeskHeader portfolio variant hides duplicate chrome", () => {
  const source = read("components/trade/trade-desk-header.tsx");
  const client = read("components/trade-portfolio-client.tsx");
  assert.match(source, /variant\?: "default" \| "portfolio"/);
  assert.match(source, /isPortfolio/);
  assert.match(client, /variant="portfolio"/);
});

test("TradeAppHeader avoids useSearchParams suspense", () => {
  const source = read("components/trade/trade-app-header.tsx");
  assert.doesNotMatch(source, /useSearchParams\s*\(/);
  assert.match(source, /usePortfolioTabFromLocation/);
});

test("portfolio sticky bar pluralizes item count", () => {
  const sticky = read("components/trade/portfolio/trade-portfolio-sticky-bar.tsx");
  const portfolio = read("lib/trade/portfolio.ts");
  assert.match(sticky, /formatPortfolioItemCount/);
  assert.match(sticky, /LIST \{formatPortfolioItemCount/);
  assert.match(portfolio, /1 ITEM/);
  assert.match(portfolio, /formatPortfolioItemCount/);
});

test("portfolio summary uses tensor-style horizontal ribbon", () => {
  const summary = read("components/trade/portfolio/trade-portfolio-summary.tsx");
  assert.match(summary, /trade-portfolio-summary flex overflow-x-auto/);
  assert.match(summary, /SummaryCell/);
});

test("wallet nfts route caches DAS inventory", () => {
  const route = read("app/api/trade/wallet/nfts/route.ts");
  assert.match(route, /unstable_cache/);
  assert.match(route, /enrichPortfolioEstValues/);
  assert.match(route, /Cache-Control/);
});

test("TradeWalletMenu links INVENTORY to /trade/portfolio", () => {
  const menu = read("components/trade/portfolio/trade-wallet-menu.tsx");
  const portfolio = read("lib/trade/portfolio.ts");

  assert.match(menu, /PORTFOLIO_WALLET_MENU/);
  assert.match(menu, /id === "inventory"\s*\?\s*TRADE_ROUTES\.portfolio/);
  assert.match(menu, /portfolioTabHref/);
  assert.match(portfolio, /if \(tab === "inventory"\) return TRADE_ROUTES\.portfolio/);
  assert.match(read("components/trade/trade-app-header.tsx"), /TradeWalletMenu/);
});

test("TradeLandingFeaturedBanner shows featured collection hero and buy/sell stats", () => {
  const source = read("components/trade/trade-landing-featured-banner.tsx");
  const landing = read("components/trade/trade-landing-desk-client.tsx");
  assert.match(source, /trade-landing-hero/);
  assert.match(source, /collectionName/);
  assert.match(source, /listedCount/);
  assert.match(source, /buyNowSol/);
  assert.match(source, /sellNowSol/);
  assert.match(source, /BUY NOW/);
  assert.match(source, /SELL NOW/);
  assert.match(source, /buyHref/);
  assert.match(landing, /TradeLandingFeaturedBanner/);
  assert.match(landing, /getTradeLandingAggregateFromCollections/);
  assert.match(landing, /firstLiveCollection\?\.href/);
  assert.match(landing, /firstLiveCollection\?\.name/);
});

test("TradeFooterTicker includes Lite/Pro toggle and market stats", () => {
  const source = read("components/trade/trade-footer-ticker.tsx");
  assert.match(source, /"use client"/);
  assert.match(source, /FooterViewToggle/);
  assert.match(source, /TRADE_FOOTER_VIEW_STORAGE_KEY|trade-footer-view-prefs/);
  assert.match(source, /SOL/);
  assert.match(source, /TPS/);
  assert.match(source, /listedCount > 0 \? listedCount : "—"/);
  assert.match(read("lib/trade-footer-view-prefs.ts"), /svf-grails-trade-footer-view/);
});

test("TradeFooterTickerServer resolves partner + treasury aggregate", () => {
  const source = read("components/trade/trade-footer-ticker-server.tsx");
  assert.match(source, /loadTradeLandingPartnerPreviews/);
  assert.match(source, /loadOptionalTradeLandingTreasuryContext/);
  assert.match(source, /getTradeLandingAggregateFromCollections/);
  assert.doesNotMatch(read("app/trade/layout.tsx"), /getTradeLandingAggregateFromCollections/);
});

test("getTradeLandingAggregateFromCollections sums listed and min floor", () => {
  const collections = getTradeLandingCollections(undefined, {
    partnerPreviews: [
      {
        slug: "collector-crypt",
        partner: "collector_crypt",
        floorSol: 2,
        listedCount: 10,
        fromFallback: false,
      },
      {
        slug: "phygitals",
        partner: "phygitals",
        floorSol: 1.5,
        listedCount: 5,
        fromFallback: false,
      },
    ],
  });

  const aggregate = getTradeLandingAggregateFromCollections(collections);
  assert.equal(aggregate.listedCount, 15);
  assert.equal(aggregate.floorSol, 1.5);
  assert.equal(aggregate.buyNowSol, 1.5);
  assert.equal(aggregate.sellNowSol, 1.5);
});
