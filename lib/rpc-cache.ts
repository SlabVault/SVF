import type { Connection, PublicKey } from "@solana/web3.js";

/** Client `getBalance` cache TTL — balances change slowly; saves Helius credits. */
export const RPC_BALANCE_CACHE_TTL_MS = 60_000;

/** Server DAS wallet inventory cache TTL (see `/api/trade/wallet/nfts`). */
export const RPC_WALLET_NFTS_CACHE_TTL_SEC = 120;

const BALANCE_RPC_MESSAGE =
  "Configure NEXT_PUBLIC_SOLANA_RPC_URL (Helius or QuickNode) for wallet balances.";

const SESSION_KEY_PREFIX = "svf-rpc-balance:";

type BalanceCacheEntry = {
  lamports: number;
  fetchedAt: number;
};

const memoryBalanceCache = new Map<string, BalanceCacheEntry>();
const inflightBalance = new Map<string, Promise<number | null>>();

function isLikelyBalanceRpcError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String(error);
  return /403|401|429|access forbidden|forbidden|rate limit|failed to get balance/i.test(
    message,
  );
}

function readSessionBalance(pubkey: string): BalanceCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${SESSION_KEY_PREFIX}${pubkey}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as BalanceCacheEntry;
    if (Date.now() - entry.fetchedAt > RPC_BALANCE_CACHE_TTL_MS) return null;
    return entry;
  } catch {
    return null;
  }
}

function writeSessionBalance(pubkey: string, lamports: number, fetchedAt: number) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      `${SESSION_KEY_PREFIX}${pubkey}`,
      JSON.stringify({ lamports, fetchedAt }),
    );
  } catch {
    /* sessionStorage quota — memory cache still applies */
  }
}

function storeBalance(pubkey: string, lamports: number) {
  const entry = { lamports, fetchedAt: Date.now() };
  memoryBalanceCache.set(pubkey, entry);
  writeSessionBalance(pubkey, lamports, entry.fetchedAt);
}

/** Cached + deduped SOL balance read — do not use for tx submission paths. */
export async function fetchCachedSolBalanceLamports(
  connection: Connection,
  publicKey: PublicKey,
): Promise<number | null> {
  const pubkey = publicKey.toBase58();
  const now = Date.now();

  const cached = memoryBalanceCache.get(pubkey);
  if (cached && now - cached.fetchedAt < RPC_BALANCE_CACHE_TTL_MS) {
    return cached.lamports;
  }

  const sessionEntry = readSessionBalance(pubkey);
  if (sessionEntry) {
    memoryBalanceCache.set(pubkey, sessionEntry);
    return sessionEntry.lamports;
  }

  const pending = inflightBalance.get(pubkey);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const lamports = await connection.getBalance(publicKey);
      storeBalance(pubkey, lamports);
      return lamports;
    } catch (error) {
      if (isLikelyBalanceRpcError(error)) {
        console.warn(BALANCE_RPC_MESSAGE);
      } else {
        console.warn("Failed to fetch SOL balance:", error);
      }
      return null;
    } finally {
      inflightBalance.delete(pubkey);
    }
  })();

  inflightBalance.set(pubkey, promise);
  return promise;
}

/** Test helper — clears client balance cache between unit tests. */
export function clearRpcBalanceCacheForTests() {
  memoryBalanceCache.clear();
  inflightBalance.clear();
}
