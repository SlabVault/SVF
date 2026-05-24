const MIN_CERT_PREFIX_DIGITS = 4;

/** Digit-only cert # prefix from palette search (optional leading `#`). */
export function parseCertPrefixQuery(query: string): string | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const withoutHash = trimmed.startsWith("#") ? trimmed.slice(1).trim() : trimmed;
  if (!withoutHash || !/^\d+$/.test(withoutHash)) return null;
  if (withoutHash.length < MIN_CERT_PREFIX_DIGITS) return null;

  return withoutHash;
}
