export const CHECKOUT_STORAGE_KEY = "svf.pending-checkouts";

export type PendingCheckout = {
  transactionId: string;
  wallet: string;
};

export function loadPendingCheckouts(): Record<string, PendingCheckout> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, PendingCheckout>;
  } catch {
    return {};
  }
}

export function savePendingCheckout(
  slabId: string,
  transactionId: string,
  wallet: string,
) {
  if (typeof window === "undefined") return;
  try {
    const parsed = loadPendingCheckouts();
    parsed[slabId] = { transactionId, wallet };
    window.localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Storage failures must not block checkout.
  }
}

export function clearPendingCheckout(slabId: string) {
  if (typeof window === "undefined") return;
  try {
    const parsed = loadPendingCheckouts();
    if (!(slabId in parsed)) return;
    delete parsed[slabId];
    window.localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Storage failures must not block checkout.
  }
}

export function getPendingCheckoutForWallet(
  slabId: string,
  wallet: string | null,
): string | null {
  if (!wallet) return null;
  const saved = loadPendingCheckouts()[slabId];
  if (!saved || saved.wallet !== wallet) return null;
  return saved.transactionId;
}
