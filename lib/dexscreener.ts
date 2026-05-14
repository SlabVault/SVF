const DEX_TOKEN_URL =
  "https://api.dexscreener.com/latest/dex/tokens" as const;

export type DexTokenStats = {
  priceUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  fdvUsd: number | null;
  pairUrl: string | null;
  dexId: string | null;
  pairAddress: string | null;
};

type DexScreenerPair = {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  priceUsd?: string;
  fdv?: number;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
};

type DexScreenerResponse = {
  pairs?: DexScreenerPair[] | null;
};

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function pickBestPair(pairs: DexScreenerPair[]): DexScreenerPair | null {
  if (!pairs.length) return null;
  return pairs.reduce<DexScreenerPair | null>((best, p) => {
    const liq = p.liquidity?.usd ?? 0;
    const bestLiq = best?.liquidity?.usd ?? 0;
    if (!best || liq > bestLiq) return p;
    return best;
  }, null);
}

export async function getDexTokenStats(
  tokenAddress: string,
): Promise<DexTokenStats | null> {
  const url = `${DEX_TOKEN_URL}/${encodeURIComponent(tokenAddress)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      next: { revalidate: 180 },
      signal: controller.signal,
      headers: { accept: "application/json" },
    });

    if (!res.ok) return null;

    const json = (await res.json()) as DexScreenerResponse;
    const pairs = (json.pairs ?? []).filter(Boolean);
    if (!pairs.length) return null;

    const p = pickBestPair(pairs);
    if (!p) return null;

    return {
      priceUsd: num(p.priceUsd),
      liquidityUsd: num(p.liquidity?.usd),
      volume24hUsd: num(p.volume?.h24),
      fdvUsd: num(p.fdv),
      pairUrl: typeof p.url === "string" ? p.url : null,
      dexId: typeof p.dexId === "string" ? p.dexId : null,
      pairAddress: typeof p.pairAddress === "string" ? p.pairAddress : null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
