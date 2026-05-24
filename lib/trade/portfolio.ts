import { PublicKey } from "@solana/web3.js";

import type { DasAssetListing } from "@/lib/helius-das";
import type { TradeLandingCollectionPreview } from "@/lib/trade-landing";
import { TRADE_ROUTES } from "@/lib/trade-routes";

/** Query param for read-only portfolio by wallet address (tensor.trade VIEW). */
export const PORTFOLIO_OWNER_QUERY = "owner";

/** Portfolio main tabs — tensor.trade parity. */
export const PORTFOLIO_TABS = [
  { id: "inventory", label: "INVENTORY" },
  { id: "received-offers", label: "RECEIVED OFFERS", soon: true },
  { id: "placed-offers", label: "PLACED OFFERS" },
  { id: "activity", label: "ACTIVITY", soon: true },
  { id: "orders-bids", label: "ORDERS & BIDS" },
  { id: "fav-nfts", label: "FAV NFTS", soon: true },
] as const;

export type PortfolioTabId = (typeof PORTFOLIO_TABS)[number]["id"];

/** Wallet dropdown nav — links to portfolio tab query. */
export const PORTFOLIO_WALLET_MENU = [
  { id: "inventory", label: "INVENTORY" },
  { id: "locks", label: "YOUR LOCKS", soon: true },
  { id: "received-offers", label: "RECEIVED OFFERS", soon: true },
  { id: "placed-offers", label: "PLACED OFFERS", soon: true },
  { id: "activity", label: "ACTIVITY", soon: true },
  { id: "orders-bids", label: "ORDERS & BIDS", soon: true },
  { id: "fav-nfts", label: "FAV NFTS", soon: true },
] as const;

export type PortfolioStatusFilter = "all" | "listed" | "owned";
export type PortfolioMarketplaceFilter = "all" | "tensor" | "other";
export type PortfolioGrailsFilter = "all" | "on-chain" | "partner";
export type PortfolioSort = "price-asc" | "price-desc" | "bids-desc";

export type PortfolioNft = DasAssetListing & {
  collectionMint: string | null;
  collectionName: string;
  listed: boolean;
  askSol: number | null;
  estValueSol: number | null;
};

export type PortfolioCollectionRow = {
  id: string;
  name: string;
  imageUri: string | null;
  floorSol: number | null;
  valueSol: number;
  ownedCount: number;
  listedCount: number;
};

export function parsePortfolioTab(value: string | null | undefined): PortfolioTabId {
  const match = PORTFOLIO_TABS.find((tab) => tab.id === value);
  return match?.id ?? "inventory";
}

export function portfolioTabHref(tab: PortfolioTabId): string {
  if (tab === "inventory") return TRADE_ROUTES.portfolio;
  return `${TRADE_ROUTES.portfolio}?tab=${encodeURIComponent(tab)}`;
}

export function parsePortfolioOwnerAddress(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  try {
    return new PublicKey(trimmed).toBase58();
  } catch {
    return null;
  }
}

export function portfolioOwnerHref(owner: string, tab?: PortfolioTabId): string {
  const params = new URLSearchParams({ [PORTFOLIO_OWNER_QUERY]: owner });
  if (tab && tab !== "inventory") params.set("tab", tab);
  return `${TRADE_ROUTES.portfolio}?${params.toString()}`;
}

export function formatPortfolioWalletAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function formatPortfolioSol(value: number | null | undefined, digits = 4): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

function resolveCollectionFloorSol(
  collectionName: string,
  collections: TradeLandingCollectionPreview[],
): number | null {
  const normalized = collectionName.trim().toLowerCase();
  if (!normalized) return null;

  for (const preview of collections) {
    const name = preview.name.trim().toLowerCase();
    const matches =
      name === normalized ||
      name.includes(normalized) ||
      normalized.includes(name) ||
      (normalized.length >= 3 && name.startsWith(normalized.slice(0, 3)));
    if (!matches) continue;

    const floor = preview.floorSol != null ? Number(preview.floorSol) : null;
    if (floor != null && Number.isFinite(floor) && floor > 0) return floor;
  }

  return null;
}

/** Apply partner desk floor when DAS has no list price — honest ingest fallback. */
export function enrichPortfolioEstValues(
  items: PortfolioNft[],
  collections: TradeLandingCollectionPreview[],
): PortfolioNft[] {
  return items.map((item) => {
    if (item.estValueSol != null && item.estValueSol > 0) return item;
    const floor = resolveCollectionFloorSol(item.collectionName, collections);
    if (floor == null) return item;
    return { ...item, estValueSol: floor };
  });
}

export function mapDasToPortfolioNft(item: DasAssetListing): PortfolioNft {
  const collectionMint =
    item.attributes.find((a) => a.trait_type === "collection")?.value ??
    null;

  const collectionName =
    item.attributes.find((a) => a.trait_type === "Collection")?.value ??
    (collectionMint ? `${collectionMint.slice(0, 4)}…` : "Unknown");

  const askSol =
    item.priceLamports != null ? item.priceLamports / 1_000_000_000 : null;

  return {
    ...item,
    collectionMint,
    collectionName,
    listed: askSol != null,
    askSol,
    estValueSol: askSol,
  };
}

export function groupPortfolioCollections(
  nfts: PortfolioNft[],
): PortfolioCollectionRow[] {
  const byKey = new Map<string, PortfolioCollectionRow>();

  for (const nft of nfts) {
    const id = nft.collectionMint ?? nft.collectionName;
    const existing = byKey.get(id);
    const value = nft.estValueSol ?? nft.askSol ?? 0;
    const priceHint = nft.askSol ?? nft.estValueSol;

    if (existing) {
      existing.ownedCount += 1;
      existing.listedCount += nft.listed ? 1 : 0;
      existing.valueSol += value;
      if (existing.floorSol == null && priceHint != null) {
        existing.floorSol = priceHint;
      } else if (priceHint != null && existing.floorSol != null) {
        existing.floorSol = Math.min(existing.floorSol, priceHint);
      }
      if (!existing.imageUri && nft.imageUri) existing.imageUri = nft.imageUri;
    } else {
      byKey.set(id, {
        id,
        name: nft.collectionName,
        imageUri: nft.imageUri,
        floorSol: priceHint,
        valueSol: value,
        ownedCount: 1,
        listedCount: nft.listed ? 1 : 0,
      });
    }
  }

  return [...byKey.values()].sort((a, b) => b.valueSol - a.valueSol);
}

export function filterPortfolioNfts(
  nfts: PortfolioNft[],
  options: {
    status: PortfolioStatusFilter;
    search: string;
    collectionId: string | null;
    sort: PortfolioSort;
  },
): PortfolioNft[] {
  let rows = [...nfts];

  if (options.status === "listed") {
    rows = rows.filter((nft) => nft.listed);
  } else if (options.status === "owned") {
    rows = rows.filter((nft) => !nft.listed);
  }

  if (options.collectionId && options.collectionId !== "all") {
    rows = rows.filter(
      (nft) => (nft.collectionMint ?? nft.collectionName) === options.collectionId,
    );
  }

  const q = options.search.trim().toLowerCase();
  if (q) {
    rows = rows.filter((nft) => nft.name.toLowerCase().includes(q));
  }

  rows.sort((a, b) => {
    const aPrice = a.askSol ?? 0;
    const bPrice = b.askSol ?? 0;
    if (options.sort === "price-asc") return aPrice - bPrice;
    if (options.sort === "price-desc") return bPrice - aPrice;
    return bPrice - aPrice;
  });

  return rows;
}

/** Honest empty copy for portfolio tabs — no placeholder rows. */
export const PORTFOLIO_TAB_EMPTY: Partial<
  Record<PortfolioTabId, { title: string; body: string }>
> = {
  "received-offers": {
    title: "No received offers",
    body: "Offers on your listed slabs will appear here once Tensor TCM offer indexing syncs to your wallet. No placeholder bids are shown.",
  },
  activity: {
    title: "No portfolio activity",
    body: "Your list, sale, bid, and delist events will sync from Tensor for this wallet. Activity rows are not fabricated.",
  },
};

export function summarizePortfolio(nfts: PortfolioNft[]) {
  const listedCount = nfts.filter((nft) => nft.listed).length;
  const estValueSol = nfts.reduce(
    (sum, nft) => sum + (nft.estValueSol ?? nft.askSol ?? 0),
    0,
  );
  const costSol = null as number | null;

  return {
    totalCount: nfts.length,
    listedCount,
    estValueSol,
    costSol,
    unrealizedPnlSol:
      costSol != null ? estValueSol - costSol : null,
  };
}

export function formatPortfolioItemCount(count: number): string {
  return count === 1 ? "1 ITEM" : `${count} ITEMS`;
}
