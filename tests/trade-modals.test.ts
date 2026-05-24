import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  DEFAULT_TRADE_ROYALTY_PCT,
  formatTradeRoyaltySol,
  formatTradeTotalSol,
  resolveTradePartnerBadge,
  resolveTradeVenueKind,
} from "@/lib/trade/trade-modal";

const ROOT = process.cwd();

function read(relPath: string) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

test("trade modal components export dense Tensor-style shells", () => {
  assert.match(read("components/trade/trade-modal-shell.tsx"), /export function TradeModalShell/);
  assert.match(read("components/trade/trade-modal-shell.tsx"), /aria-modal="true"/);
  assert.match(read("components/trade/trade-modal-shell.tsx"), /event\.key === "Escape"/);
  assert.match(read("components/trade/buy-now-modal.tsx"), /export function BuyNowModal/);
  assert.match(read("components/trade/place-offer-modal.tsx"), /export function PlaceOfferModal/);
  assert.match(read("components/trade/list-for-sale-modal.tsx"), /export function ListForSaleModal/);
});

test("BuyNowModal shows price breakdown, wallet, and gated confirm", () => {
  const source = read("components/trade/buy-now-modal.tsx");
  assert.match(source, /WalletButton/);
  assert.match(source, /Royalty/);
  assert.match(source, /isTradeWriteEnabledClient/);
  assert.match(source, /disabled=\{confirmDisabled\}/);
  assert.match(source, /PlatformBadge/);
  assert.match(source, /Open on partner/);
});

test("BuyNowModal promotes partner checkout when off-chain settlement", () => {
  const source = read("components/trade/buy-now-modal.tsx");
  assert.match(source, /isPartnerPrimaryCheckout/);
  assert.match(source, /!onChainBuy/);
  assert.match(source, /tradeListingUsesPartnerSiteSettlement/);
  assert.match(source, /tradeListingShowsPartnerBuyLink/);
  assert.match(
    source,
    /isPartnerPrimaryCheckout[\s\S]*tradeListingUsesPartnerSiteSettlement[\s\S]*tradeListingShowsPartnerBuyLink/,
  );
  assert.match(
    source,
    /isPartnerPrimaryCheckout[\s\S]*tensor-btn-primary[\s\S]*Open on partner/,
  );
  assert.match(source, /This listing settles on the partner site/);
  assert.match(source, /On-chain buy is not available here/);
});

test("BuyNowModal honest buy gates surface block reason and partner-primary settlement", () => {
  const source = read("components/trade/buy-now-modal.tsx");
  const mapper = read("components/trade/tensor/map-listing.ts");

  assert.match(source, /resolveOnChainBuyBlockReason/);
  assert.match(source, /onChainBlockReason = resolveOnChainBuyBlockReason/);
  assert.match(source, /resolvesOnChainSettlement/);
  assert.match(
    mapper,
    /Listing missing seller wallet or list state for on-chain buy\./,
  );
  assert.match(source, /title=\{[\s\S]*onChainBlockReason \?\? undefined/);
  assert.match(source, /connected && writeEnabled && onChainBlockReason/);
  assert.match(
    source,
    /\{onChainBlockReason\} Use partner checkout below when settlement is off-chain\./,
  );
  assert.match(
    source,
    /connected && writeEnabled && onChainBlockReason[\s\S]*role="status"/,
  );
  assert.match(source, /disabled=\{confirmDisabled\}/);
  assert.match(source, /writeEnabled && connected && !onChainBuy/);
});

test("BuyNowModal confirm wires useTensorBuy dry-run path", () => {
  const source = read("components/trade/buy-now-modal.tsx");
  const hook = read("components/trade/tensor/use-tensor-buy.ts");
  assert.match(source, /useTensorBuy/);
  assert.match(source, /mapTradeListingToTensorNft/);
  assert.match(source, /canBuyOnChain/);
  assert.match(source, /handleConfirm/);
  assert.match(source, /await buy\(nft/);
  assert.match(hook, /\/api\/trade\/tx\/buy/);
  assert.match(hook, /fetchTensorTxRoute/);
});

test("PlaceOfferModal stub includes offer amount input and expiry", () => {
  const source = read("components/trade/place-offer-modal.tsx");
  assert.match(source, /Offer amount \(SOL\)/);
  assert.match(source, /Expiry/);
  assert.match(source, /type="number"/);
  assert.match(source, /resolveTradeListingMint/);
});

test("ListForSaleModal stub includes fixed price input", () => {
  const source = read("components/trade/list-for-sale-modal.tsx");
  assert.match(source, /Fixed price \(SOL\)/);
  assert.match(source, /WalletButton/);
});

test("TradeListingTile opens buy and offer modals from CTAs", () => {
  const source = read("components/trade/tensor/nft-card.tsx");
  assert.match(source, /BuyNowModal/);
  assert.match(source, /PlaceOfferModal/);
  assert.match(source, /setBuyOpen\(true\)/);
  assert.match(source, /setOfferOpen\(true\)/);
  assert.doesNotMatch(source, /disabled>\s*\n\s*Buy/);
});

test("Trade portfolio inventory tab wires ListForSaleModal", () => {
  const source = read("components/trade-portfolio-client.tsx");
  assert.match(source, /ListForSaleModal/);
  assert.match(source, /List for sale/);
  assert.match(source, /INVENTORY/);
  assert.match(source, /useWallet\(\)/);
});

test("trade modal helpers compute royalty and venue labels", () => {
  assert.equal(resolveTradeVenueKind("collector-crypt"), "collector_crypt");
  assert.equal(resolveTradeVenueKind("magic-eden"), "tensor");
  assert.equal(resolveTradeVenueKind("slabvault-treasury"), "slabvault");
  assert.equal(resolveTradePartnerBadge("phygitals").source, "phygitals");
  assert.equal(formatTradeRoyaltySol(10), 10 * (DEFAULT_TRADE_ROYALTY_PCT / 100));
  assert.equal(formatTradeTotalSol(10), 10.5);
});
