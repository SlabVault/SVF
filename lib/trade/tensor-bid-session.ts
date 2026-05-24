/** Session-scoped bid state from recent place-bid txs — cancel fallback before read API indexes. */

const KEY_PREFIX = "svf:tensor-bid-state:";

export function tensorBidSessionKey(mint: string): string {
  return `${KEY_PREFIX}${mint.trim()}`;
}

export function storeTensorBidState(mint: string, bidStateAddress: string): void {
  if (typeof sessionStorage === "undefined") return;
  const trimmedMint = mint.trim();
  const trimmedState = bidStateAddress.trim();
  if (!trimmedMint || !trimmedState) return;
  try {
    sessionStorage.setItem(tensorBidSessionKey(trimmedMint), trimmedState);
  } catch {
    /* quota / private mode */
  }
}

export function readTensorBidState(mint: string): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage.getItem(tensorBidSessionKey(mint.trim()));
  } catch {
    return null;
  }
}

export function removeTensorBidState(mint: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(tensorBidSessionKey(mint.trim()));
  } catch {
    /* ignore */
  }
}

export function readAllTensorBidStates(): Array<{ mint: string; bidStateAddress: string }> {
  if (typeof sessionStorage === "undefined") return [];
  const rows: Array<{ mint: string; bidStateAddress: string }> = [];
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key?.startsWith(KEY_PREFIX)) continue;
      const bidStateAddress = sessionStorage.getItem(key)?.trim();
      if (!bidStateAddress) continue;
      rows.push({ mint: key.slice(KEY_PREFIX.length), bidStateAddress });
    }
  } catch {
    return [];
  }
  return rows;
}
