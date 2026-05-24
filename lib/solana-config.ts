import type { Connection, PublicKey } from "@solana/web3.js";

import { fetchCachedSolBalanceLamports } from "@/lib/rpc-cache";

/** Public mainnet-beta endpoint — rate-limited; prefer Helius/QuickNode in dev and prod. */
export const DEFAULT_PUBLIC_SOLANA_RPC = "https://api.mainnet-beta.solana.com";

export const SOLANA_RPC_CONFIG_MESSAGE =
  "Configure NEXT_PUBLIC_SOLANA_RPC_URL (Helius or QuickNode) for wallet balances.";

type SolanaEnv = {
  NEXT_PUBLIC_SOLANA_RPC_URL?: string;
  NEXT_PUBLIC_SOLANA_RPC?: string;
  SOLANA_RPC_URL?: string;
  HELIUS_API_KEY?: string;
  HELIUS_RPC_URL?: string;
};

function readSolanaEnv(env?: SolanaEnv): SolanaEnv {
  return env ?? (process.env as SolanaEnv);
}

export function buildHeliusRpcUrl(apiKey: string, customUrl?: string | null): string {
  const custom = customUrl?.trim();
  if (custom) return custom;
  return `https://mainnet.helius-rpc.com/?api-key=${apiKey.trim()}`;
}

/** Server-only — never expose HELIUS_API_KEY to the client bundle. */
export function getHeliusRpcUrl(env?: SolanaEnv): string | undefined {
  const e = readSolanaEnv(env);
  const key = e.HELIUS_API_KEY?.trim();
  if (!key) return undefined;
  return buildHeliusRpcUrl(key, e.HELIUS_RPC_URL);
}

/** Browser wallet adapter + client-side ConnectionProvider. */
export function resolveClientSolanaRpcUrl(env?: SolanaEnv): string {
  const e = readSolanaEnv(env);
  return (
    e.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() ||
    e.NEXT_PUBLIC_SOLANA_RPC?.trim() ||
    DEFAULT_PUBLIC_SOLANA_RPC
  );
}

/** Server routes, payment verify, tx simulation — prefers SOLANA_RPC_URL then Helius. */
export function resolveServerSolanaRpcUrl(env?: SolanaEnv): string {
  const e = readSolanaEnv(env);
  const explicit = e.SOLANA_RPC_URL?.trim();
  if (explicit) return explicit;

  const helius = getHeliusRpcUrl(e);
  if (helius) return helius;

  return resolveClientSolanaRpcUrl(e);
}

/** Resolves client URL in the browser; server URL on Node. */
export function getSolanaRpcUrl(env?: SolanaEnv): string {
  if (typeof window !== "undefined") {
    return resolveClientSolanaRpcUrl(env);
  }
  return resolveServerSolanaRpcUrl(env);
}

export function isSolanaRpcExplicitlyConfigured(env?: SolanaEnv): boolean {
  const e = readSolanaEnv(env);
  return Boolean(
    e.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() ||
      e.NEXT_PUBLIC_SOLANA_RPC?.trim() ||
      e.SOLANA_RPC_URL?.trim() ||
      e.HELIUS_API_KEY?.trim(),
  );
}

export function isLikelySolanaRpcError(error: unknown): boolean {
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

export function shouldSuppressRpcRejection(reason: unknown): boolean {
  return isLikelySolanaRpcError(reason);
}

/**
 * Returns lamports or null when RPC is unreachable / forbidden — never throws.
 * Cached in memory + sessionStorage (60s TTL) with in-flight dedupe — not for tx writes.
 */
export async function fetchSolBalanceLamports(
  connection: Connection,
  publicKey: PublicKey,
): Promise<number | null> {
  return fetchCachedSolBalanceLamports(connection, publicKey);
}
