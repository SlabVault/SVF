const COINGECKO_SOL_USD_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd" as const;

/** Public SOL/USD spot — cached 60s via Next fetch revalidate. */
export async function fetchSolUsdPrice(): Promise<number | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(COINGECKO_SOL_USD_URL, {
      next: { revalidate: 60 },
      signal: controller.signal,
      headers: { accept: "application/json" },
    });

    if (!res.ok) return null;

    const json = (await res.json()) as { solana?: { usd?: unknown } };
    const usd = json.solana?.usd;
    if (typeof usd !== "number" || !Number.isFinite(usd) || usd <= 0) return null;
    return usd;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Footer / ticker label — honest fallback when price unavailable. */
export function formatSolUsdTicker(priceUsd: number | null | undefined): string {
  if (priceUsd == null || !Number.isFinite(priceUsd) || priceUsd <= 0) {
    return "SOL —";
  }
  return `SOL $${priceUsd.toFixed(2)}`;
}

/** Footer SOL/USD value cell — label column already says "SOL". */
export function formatSolUsdFooterPrice(priceUsd: number | null | undefined): string {
  return formatSolUsdTicker(priceUsd).replace(/^SOL /, "");
}
