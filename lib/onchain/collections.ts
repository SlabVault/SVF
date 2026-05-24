/**
 * SlabVault trade collection catalog — maps `/trade/c/[slug]` to partner mints.
 * On-chain whitelist uses Tensor TL1ST program; mint addresses confirmed via DAS.
 *
 * @see docs/integrations/gacha-nft-metadata.md
 * @see docs/trade-architecture.md
 */

export type TradeChainId = "solana" | "base" | "polygon";

export type TradePartnerId =
  | "collector_crypt"
  | "phygitals"
  | "magic_eden"
  | "slabvault_treasury"
  | "beezie"
  | "courtyard";

export type TradeSettlementMode =
  | "on_chain_tensor"
  | "partner_site"
  | "vault_tcm";

export type TradeCollectionStatus = "live" | "preview";

export type TradeCollectionConfig = {
  slug: string;
  partner: TradePartnerId;
  name: string;
  chain: TradeChainId;
  status: TradeCollectionStatus;
  settlementMode: TradeSettlementMode;
  /** Metaplex collection mint or Bubblegum tree — set after DAS confirmation. */
  collectionMint: string | null;
  tokenStandard: "pnft" | "cnft" | "unknown";
  tensorSdk: "tensorswap" | "tcomp" | "marketplace_js" | null;
  whitelistOnTensor: boolean;
  notes: string;
};

/** Registry for graded-card collections on `/trade`. Mint fields are null until indexed. */
export const SLABVAULT_TRADE_COLLECTIONS: TradeCollectionConfig[] = [
  {
    slug: "collector-crypt",
    partner: "collector_crypt",
    name: "Collector Crypt",
    chain: "solana",
    status: "live",
    settlementMode: "on_chain_tensor",
    collectionMint: null,
    tokenStandard: "pnft",
    tensorSdk: "tensorswap",
    whitelistOnTensor: false,
    notes: "Confirm CC collection mint via Helius DAS + ME slug collector_crypt",
  },
  {
    slug: "phygitals",
    partner: "phygitals",
    name: "Phygitals",
    chain: "solana",
    status: "live",
    settlementMode: "on_chain_tensor",
    collectionMint: null,
    tokenStandard: "cnft",
    tensorSdk: "tcomp",
    whitelistOnTensor: false,
    notes: "Requires Bubblegum tree id + tcomp-sdk proofs",
  },
  {
    slug: "magic-eden",
    partner: "magic_eden",
    name: "Magic Eden Slabs",
    chain: "solana",
    status: "preview",
    settlementMode: "on_chain_tensor",
    collectionMint: null,
    tokenStandard: "pnft",
    tensorSdk: "marketplace_js",
    whitelistOnTensor: false,
    notes: "Cross-venue graded-card asks where Tensor index covers ME depth",
  },
  {
    slug: "slabvault-treasury",
    partner: "slabvault_treasury",
    name: "SlabVault Treasury",
    chain: "solana",
    status: "live",
    settlementMode: "vault_tcm",
    collectionMint: null,
    tokenStandard: "pnft",
    tensorSdk: "marketplace_js",
    whitelistOnTensor: false,
    notes: "Vault wallet lists selected slabs on TCM; fee PDA → SVF treasury",
  },
  {
    slug: "beezie",
    partner: "beezie",
    name: "Beezie",
    chain: "base",
    status: "preview",
    settlementMode: "partner_site",
    collectionMint: null,
    tokenStandard: "unknown",
    tensorSdk: null,
    whitelistOnTensor: false,
    notes: "Base-native partner — ingest when API ships; deep link v1, Base wallet v2",
  },
  {
    slug: "courtyard",
    partner: "courtyard",
    name: "Courtyard",
    chain: "polygon",
    status: "preview",
    settlementMode: "partner_site",
    collectionMint: null,
    tokenStandard: "unknown",
    tensorSdk: null,
    whitelistOnTensor: false,
    notes: "Polygon partner — cert dedupe across chains; deep link until bridge path exists",
  },
];

export function getTradeCollectionBySlug(
  slug: string,
): TradeCollectionConfig | undefined {
  return SLABVAULT_TRADE_COLLECTIONS.find((c) => c.slug === slug);
}

/** Beezie is Base-native — not on Tensor Solana programs until multichain settlement ships. */
export const BEEZIE_OFF_CHAIN_NOTE =
  "Beezie listings are not settled via Tensor Solana programs; use partner deep links.";

/** Courtyard is Polygon-native — indexed for compare; settlement via partner site in v1. */
export const COURTYARD_OFF_CHAIN_NOTE =
  "Courtyard listings settle on Polygon; GRAILS shows compare + deep link until multichain fill ships.";
