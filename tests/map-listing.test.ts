import assert from "node:assert/strict";
import { test } from "node:test";

import {
  mapTradeListingToTensorNft,
  resolveOnChainBuyBlockReason,
  tradeListingHasOnChainBuyMetadata,
} from "@/components/trade/tensor/map-listing";
import type { TradeListing } from "@/lib/trade-listings";

const ON_CHAIN_MINT = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";

function certListing(overrides: Partial<TradeListing> = {}): TradeListing {
  return {
    id: "12345678",
    name: "Charizard PSA 10",
    grade: "PSA 10",
    estimatedValueUsd: 500,
    acquiredAt: "2026-01-10",
    imageUrl: "/charizard.jpg",
    vaultedUrl: `https://solscan.io/token/${ON_CHAIN_MINT}`,
    collectrUrl: null,
    status: "AVAILABLE",
    solPrice: 2.5,
    svfPrice: 50000,
    askSol: 2.5,
    collectionId: "collector-crypt-pokemon",
    sellerWallet: "SellerWallet1111111111111111111111111111",
    ...overrides,
  };
}

test("mapTradeListingToTensorNft resolves mint from solscan vaultedUrl when id is cert", () => {
  const listing = certListing();
  const nft = mapTradeListingToTensorNft(listing, "collector-crypt-pokemon");

  assert.equal(nft.mint, ON_CHAIN_MINT);
  assert.equal(nft.certOrMint, "12345678");
  assert.equal(nft.listing.seller, listing.sellerWallet);
  assert.equal(nft.owner, listing.sellerWallet);
  assert.equal(nft.listing.listState, "");
});

test("mapTradeListingToTensorNft propagates listState when sellerWallet is absent", () => {
  const listState = "ListStatePda1111111111111111111111111111111111";
  const listing = certListing({ sellerWallet: undefined, listState });
  const nft = mapTradeListingToTensorNft(listing, "collector-crypt-pokemon");

  assert.equal(nft.listing.listState, listState);
  assert.equal(nft.listing.seller, "");
  assert.equal(nft.owner, "");
});

test("mapTradeListingToTensorNft maps sellerWallet to nft.listing.seller and owner", () => {
  const seller = "SellerWallet1111111111111111111111111111111111111";
  const listing = certListing({ sellerWallet: seller, listState: undefined });
  const nft = mapTradeListingToTensorNft(listing, "collector-crypt-pokemon");

  assert.equal(nft.listing.seller, seller);
  assert.equal(nft.owner, seller);
  assert.equal(nft.listing.listState, "");
});

test("mapTradeListingToTensorNft uses listing id when it is already a Solana mint", () => {
  const listing = certListing({
    id: ON_CHAIN_MINT,
    vaultedUrl: "https://vaulted.example/other",
  });
  const nft = mapTradeListingToTensorNft(listing, "collector-crypt-pokemon");

  assert.equal(nft.mint, ON_CHAIN_MINT);
});

test("mapTradeListingToTensorNft falls back to listing id when mint cannot be resolved", () => {
  const listing = certListing({
    vaultedUrl: "https://vaulted.example/no-mint",
  });
  const nft = mapTradeListingToTensorNft(listing, "collector-crypt-pokemon");

  assert.equal(nft.mint, "12345678");
});

test("tradeListingHasOnChainBuyMetadata is true when sellerWallet is set", () => {
  const listing = certListing({ sellerWallet: "SellerWallet1111111111111111111111111111" });
  assert.equal(tradeListingHasOnChainBuyMetadata(listing), true);
});

test("tradeListingHasOnChainBuyMetadata is true when listState is set", () => {
  const listing = certListing({
    sellerWallet: undefined,
    listState: "ListStatePda1111111111111111111111111111",
  });
  assert.equal(tradeListingHasOnChainBuyMetadata(listing), true);
});

test("tradeListingHasOnChainBuyMetadata is false when seller and listState are missing or blank", () => {
  assert.equal(
    tradeListingHasOnChainBuyMetadata(certListing({ sellerWallet: undefined, listState: undefined })),
    false,
  );
  assert.equal(
    tradeListingHasOnChainBuyMetadata(certListing({ sellerWallet: "   ", listState: "" })),
    false,
  );
});

test("resolveOnChainBuyBlockReason returns null when on-chain settlement is off", () => {
  const listing = certListing({ sellerWallet: undefined, listState: undefined });
  assert.equal(resolveOnChainBuyBlockReason(listing, false), null);
});

test("resolveOnChainBuyBlockReason returns null when on-chain metadata is present", () => {
  assert.equal(resolveOnChainBuyBlockReason(certListing(), true), null);
  assert.equal(
    resolveOnChainBuyBlockReason(
      certListing({ sellerWallet: undefined, listState: "ListStatePda1111111111111111111111111111" }),
      true,
    ),
    null,
  );
});

test("resolveOnChainBuyBlockReason blocks on-chain buy when metadata is missing", () => {
  const listing = certListing({ sellerWallet: undefined, listState: undefined });
  assert.equal(
    resolveOnChainBuyBlockReason(listing, true),
    "Listing missing seller wallet or list state for on-chain buy.",
  );
});
