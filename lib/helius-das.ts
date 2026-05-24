/**
 * Helius DAS fallback when Tensor API is unavailable or lacks a row.
 *
 * @see docs/integrations/gacha-nft-metadata.md
 */

import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { getHeliusRpcUrl as getHeliusRpcUrlFromConfig } from "@/lib/solana-config";
import { isHeliusDasConfigured } from "@/lib/integrations/tensor";

const HELIUS_DAS_TIMEOUT_MS = 8_000;

export type DasAssetListing = {
  id: string;
  mint: string | null;
  name: string;
  imageUri: string | null;
  priceLamports: number | null;
  /** Token owner from DAS — not the same as TCM list-state seller when unlisted. */
  ownerWallet: string | null;
  attributes: { trait_type: string; value: string }[];
};

type DasSearchResponse = {
  result?: {
    items?: DasAssetItem[];
    total?: number;
  };
  error?: { message?: string };
};

type DasAssetItem = {
  id?: string;
  id_str?: string;
  compression?: { compressed?: boolean };
  grouping?: { group_key?: string; group_value?: string }[];
  content?: {
    metadata?: {
      name?: string;
      attributes?: { trait_type?: string; value?: string }[];
    };
    links?: { image?: string; external_url?: string };
  };
  ownership?: { owner?: string };
  token_info?: { price_info?: { price_per_token?: number } };
};

async function dasRpc<T>(method: string, params: unknown): Promise<T> {
  const url = getHeliusRpcUrlFromConfig();
  if (!url) throw new Error("HELIUS_API_KEY is not configured");

  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: "svf-das", method, params }),
      next: { revalidate: 120 },
    },
    HELIUS_DAS_TIMEOUT_MS,
  );

  if (!res.ok) {
    throw new Error(`Helius DAS ${res.status}`);
  }

  const json = (await res.json()) as T & { error?: { message?: string } };
  if (json && typeof json === "object" && "error" in json && json.error) {
    throw new Error(json.error.message ?? "Helius DAS error");
  }
  return json;
}

function mapDasItem(item: DasAssetItem): DasAssetListing | null {
  const id = item.id ?? item.id_str;
  if (!id) return null;
  const name =
    item.content?.metadata?.name?.trim() ||
    `${String(id).slice(0, 8)}…`;
  const attrs = (item.content?.metadata?.attributes ?? [])
    .filter((a) => a.trait_type && a.value)
    .map((a) => ({
      trait_type: String(a.trait_type),
      value: String(a.value),
    }));

  const collectionGroup = item.grouping?.find((g) => g.group_key === "collection");
  if (collectionGroup?.group_value) {
    attrs.push({
      trait_type: "collection",
      value: collectionGroup.group_value,
    });
  }

  const pricePerToken = item.token_info?.price_info?.price_per_token;
  const priceLamports =
    pricePerToken != null && Number.isFinite(pricePerToken)
      ? Math.round(pricePerToken * 1_000_000_000)
      : null;

  return {
    id,
    mint: item.compression?.compressed ? null : id,
    name,
    imageUri: item.content?.links?.image ?? null,
    priceLamports,
    ownerWallet: item.ownership?.owner?.trim() ?? null,
    attributes: attrs,
  };
}

/** Search listed assets for a Metaplex collection mint (DAS grouping). */
export async function searchDasCollectionAssets(
  collectionMint: string,
  limit = 48,
): Promise<DasAssetListing[]> {
  if (!isHeliusDasConfigured()) return [];

  const data = await dasRpc<DasSearchResponse>("searchAssets", {
    grouping: ["collection", collectionMint],
    limit,
    page: 1,
    burnt: false,
  });

  return (data.result?.items ?? [])
    .map(mapDasItem)
    .filter((row): row is DasAssetListing => row != null);
}

/** Wallet inventory via Helius DAS — requires HELIUS_API_KEY. */
export async function searchDasWalletAssets(
  ownerAddress: string,
  limit = 100,
): Promise<DasAssetListing[]> {
  if (!isHeliusDasConfigured()) return [];

  const data = await dasRpc<DasSearchResponse>("searchAssets", {
    ownerAddress,
    limit,
    page: 1,
    burnt: false,
  });

  return (data.result?.items ?? [])
    .map(mapDasItem)
    .filter((row): row is DasAssetListing => row != null);
}

export { isHeliusDasConfigured };
