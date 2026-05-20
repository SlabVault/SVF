export type SiteLinks = {
  pump: string;
  dexscreener: string;
  birdeye: string;
  twitter: string;
  telegram: string;
  discord: string;
  linktree: string;
  gitbook: string;
  vollector: string;
  vaulted: string;
  collectr: string;
  collectorCryptTreasury: string;
  collectorCryptDeployer: string;
  gachaCollectorCrypt: string;
  gachaPhygitals: string;
  gachaBeezie: string;
  poolSvfCards: string;
  poolSvfPigeon: string;
};

export type SiteStream = {
  live: boolean;
  embedUrl: string;
  watchUrl: string;
};

export type LivePull = {
  active: boolean;
  title: string;
  partner: string;
  url: string;
  endsAt?: string;
  message?: string;
};

export type CollectorCryptAccount = {
  label: string;
  url: string;
};

export type VollectorProfile = {
  label: string;
  url: string;
};

export type LatestPull = {
  title: string;
  date: string;
  source: string;
  detail: string;
  clipUrl: string;
};

export type LatestSlab = {
  name: string;
  grade: string;
  imageUrl: string;
  note: string;
};

export type RoadmapPhase = {
  phase: string;
  items: string[];
};

export type GachaTier = {
  name: string;
  priceLabel: string;
  href: string;
  imageUrl?: string;
};

export type SiteConfig = {
  brandName: string;
  ticker: string;
  tagline: string;
  description: string;
  contractAddress: string;
  vaultAddresses: {
    snsTreasury: string;
    snsDeployer: string;
    treasury: string;
    deployer: string;
  };
  manualVaultValueUsd: number | null;
  treasurySquadsUrl: string;
  links: SiteLinks;
  livePull: LivePull;
  collectorCryptAccounts: CollectorCryptAccount[];
  vollector: VollectorProfile;
  gachaTiers?: GachaTier[];
  stream: SiteStream;
  latestPull: LatestPull;
  latestSlab: LatestSlab;
  roadmap: RoadmapPhase[];
  // Optional fields for automated data sync
  treasuryBalanceSol?: number;
  deployerBalanceSol?: number;
  lastWalletSync?: string;
  lastSyncAt?: string;
};

export type SlabItem = {
  id: string;
  name: string;
  grade: string;
  estimatedValueUsd: number | null;
  acquiredAt: string;
  imageUrl: string;
  vaultedUrl: string;
  collectrUrl: string;
};

export type PullItem = {
  id: string;
  date: string;
  source: string;
  summary: string;
  costUsd: number | null;
  outcomeUsd: number | null;
  clipUrl: string;
  /** Optional thumbnail (slab scan or clip still). */
  imageUrl?: string;
};
