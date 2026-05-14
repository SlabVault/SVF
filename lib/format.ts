export function formatUsd(value: number, fallback = "—"): string {
  if (!Number.isFinite(value)) return fallback;
  const maxDigits = value >= 1 ? 2 : value >= 0.01 ? 4 : 6;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: maxDigits,
  }).format(value);
}
