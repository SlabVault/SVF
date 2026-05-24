import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();

function read(relPath: string) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

test("M2 item page: OVERVIEW · ACTIVITY · OFFERS tabs", () => {
  const client = read("components/trade/trade-item-detail-client.tsx");

  assert.match(client, /label: "OVERVIEW"/);
  assert.match(client, /label: "ACTIVITY"/);
  assert.match(client, /\{ id: "offers", label: "OFFERS", soon: true \}/);
  assert.match(client, /ItemOffersPanel/);
  assert.match(client, /activeTab === "overview"/);
  assert.match(client, /activeTab === "activity"/);
  assert.match(client, /activeTab === "offers"/);
  assert.doesNotMatch(client, /disabled: true/);
});

test("M2 item page: commerce stack with listed price and buy/offer CTAs", () => {
  const client = read("components/trade/trade-item-detail-client.tsx");

  assert.match(client, /Listed for/);
  assert.match(client, /BUY NOW/);
  assert.match(client, /PLACE OFFER/);
  assert.match(client, /formatListedAskUsd/);
  assert.match(client, /Royalty/);
  assert.match(client, /TradeMobileActionBar/);
  assert.match(client, /BuyNowModal/);
  assert.match(client, /PlaceOfferModal/);
});

test("M2 item page: prev/next in-collection navigation", () => {
  const client = read("components/trade/trade-item-detail-client.tsx");
  const page = read("app/trade/slab/[certOrMint]/page.tsx");

  assert.match(client, /ItemNavArrows/);
  assert.match(client, /adjacentItems\?: TradeItemAdjacentLinks/);
  assert.match(client, /← Prev/);
  assert.match(client, /Next →/);
  assert.match(client, /Previous listing in collection/);
  assert.match(client, /Next listing in collection/);
  assert.match(page, /getTradeItemAdjacentLinks/);
  assert.match(page, /adjacentItems=\{adjacentItems\}/);
});

test("P4 item page: partner checkout CTA when off-chain settlement", () => {
  const client = read("components/trade/trade-item-detail-client.tsx");

  assert.match(client, /tradeListingShowsPartnerBuyLink/);
  assert.match(client, /resolveTradeListingPartnerCheckoutUrl/);
  assert.match(client, /partnerPrimaryCheckout/);
  assert.match(client, /showOnChainBuyCta/);
  assert.match(client, /Open on partner ↗/);
  assert.match(client, /cta_trade_partner_deep_link/);
  assert.match(
    client,
    /showOnChainBuyCta \? \([\s\S]*tensor-btn-primary[\s\S]*BUY NOW/,
  );
  assert.match(
    client,
    /partnerCheckoutUrl \? \([\s\S]*variant="secondary"[\s\S]*Open on partner ↗/,
  );
  assert.match(client, /partnerPrimaryCheckout=\{partnerPrimaryCheckout\}/);
  assert.match(client, /showOnChainBuyCta=\{showOnChainBuyCta\}/);
  assert.match(
    client,
    /showOnChainBuyCta \? \([\s\S]*Connect wallet to buy/,
  );
  assert.doesNotMatch(
    client,
    /partnerCheckoutUrl \? \([\s\S]*Connect wallet to buy/,
  );
});
