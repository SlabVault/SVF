export function formatUsd(value: number, fallback = "—"): string {
  if (!Number.isFinite(value)) return fallback;
  const maxDigits = value >= 1 ? 2 : value >= 0.01 ? 4 : 6;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: maxDigits,
  }).format(value);
}

export function formatDate(
  value: Date | string | null | undefined,
  fallback = "Unknown date",
  locales?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) return fallback;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  const resolvedLocales = locales ?? "en-US";
  const resolvedOptions = options
    ? { ...options, timeZone: options.timeZone ?? "UTC" }
    : { timeZone: "UTC" };

  return date.toLocaleDateString(resolvedLocales, resolvedOptions);
}
