/**
 * Tensor Foundation integration — GRAILS full aggregator stack.
 *
 * **Read path:** partner ingest + Helius DAS + Tensor REST BFF (`/api/trade/collection-*`).
 * **Write path:** BFF `/api/trade/tx/*` + tensorswap-sdk / tcomp-sdk → TCM mainnet programs.
 * **UI:** `components/trade/tensor/` — vendor template supplies BFF tx patterns.
 *
 * @see docs/trade-architecture.md
 * @see docs/integrations/onchain-trade-stack.md
 */

import { parseEnvFlag } from "@/lib/env-flags";

/** Canonical tensor-foundation programs + tensor-hq UI template references. */
export const TENSOR_FOUNDATION_REPOS = {
  marketplacePrograms:
    "https://github.com/tensor-foundation/marketplace",
  /** UI/UX reference — fork layout patterns, not REST API dependency. */
  marketplaceNextjsTemplate:
    "https://github.com/tensor-hq/marketplace-nextjs-template",
  idls: "https://github.com/tensor-foundation/IDLs",
  fees: "https://github.com/tensor-foundation/fees",
  escrow: "https://github.com/tensor-foundation/escrow",
  whitelist: "https://github.com/tensor-foundation/whitelist",
  amm: "https://github.com/tensor-foundation/amm",
  developerHub: "https://dev.tensor.trade/docs/getting-started-1",
  apiAndSdk: "https://docs.tensor.trade/trade/api-and-sdk",
  protocols: "https://docs.tensor.foundation/protocols",
} as const;

/** Re-export on-chain program IDs — see docs/integrations/onchain-trade-stack.md */
export {
  TENSOR_PROGRAM_IDS,
  getTensorProgramId,
  getOnchainCluster,
} from "@/lib/onchain/program-ids";

/**
 * Installed npm packages (Phase 1 read uses REST; Phase 2+ write uses legacy SDKs).
 * @tensor-foundation/marketplace targets web3.js v2 — deferred until SVF upgrades RPC stack.
 */
export const TENSOR_SDK_PACKAGES = {
  tensorswap: "@tensor-oss/tensorswap-sdk",
  tcomp: "@tensor-oss/tcomp-sdk",
  marketplaceJs: "@tensor-foundation/marketplace",
} as const;

/** Packages pinned in root package.json for on-chain write paths. */
export const TENSOR_INSTALLED_PACKAGES = [
  TENSOR_SDK_PACKAGES.tensorswap,
  TENSOR_SDK_PACKAGES.tcomp,
] as const;

const DEFAULT_TENSOR_API_BASE = "https://api.mainnet.tensordev.io";

/**
 * Optional Tensor REST shortcut — deprecated for MVP read path.
 * Partner ingest + Helius DAS are primary; enable only for enriched stats / ME depth experiments.
 */
export function isTensorReadConfigured(): boolean {
  return Boolean(getTensorApiKey());
}

export function getTensorApiKey(): string | undefined {
  const key = process.env.TENSOR_API_KEY?.trim();
  return key || undefined;
}

/** Tensor REST base — template uses api.mainnet.tensordev.io. */
export function getTensorApiBaseUrl(): string {
  return process.env.TENSOR_API_BASE_URL?.trim() || DEFAULT_TENSOR_API_BASE;
}

/** Phase 1: at least one CC collection slug configured for Tensor-indexed reads. */
export function getTensorCcCollectionSlugs(): string[] {
  const raw = process.env.TENSOR_CC_COLLECTION_SLUGS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
}

export function isTensorCcReadConfigured(): boolean {
  return isTensorReadConfigured() && getTensorCcCollectionSlugs().length > 0;
}

/** Phase 2–3: list/bid/fill via Tensor SDK (off by default in production). */
export function isTensorTradeWriteEnabled(): boolean {
  return parseEnvFlag(process.env.TENSOR_TRADE_WRITE_ENABLED, false);
}

/** Optional Helius DAS fallback for cert↔mint when Tensor API lacks a row. */
export function isHeliusDasConfigured(): boolean {
  return Boolean(process.env.HELIUS_API_KEY?.trim());
}
