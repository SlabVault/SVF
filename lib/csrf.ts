import { jsonError } from "@/lib/api-errors";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isStateChangingMethod(method: string): boolean {
  return STATE_CHANGING_METHODS.has(method.toUpperCase());
}

/** Machine callers using Bearer auth are exempt from browser CSRF checks. */
export function hasBearerAuthorization(request: Request): boolean {
  const authorization = request.headers.get("authorization");
  if (!authorization) return false;
  return authorization.trim().toLowerCase().startsWith("bearer ");
}

export function getTrustedOrigins(): string[] {
  const origins = new Set<string>();

  for (const raw of [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXTAUTH_URL,
  ]) {
    const value = raw?.trim();
    if (!value) continue;
    try {
      origins.add(new URL(value).origin);
    } catch {
      // Ignore malformed URLs in env.
    }
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  return [...origins];
}

function originFromReferer(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function isTrustedWriteOrigin(request: Request): boolean {
  const trusted = getTrustedOrigins();
  const origin =
    request.headers.get("origin") ??
    originFromReferer(request.headers.get("referer"));

  if (origin) {
    if (trusted.length === 0) {
      return process.env.NODE_ENV !== "production";
    }
    return trusted.includes(origin);
  }

  const secFetchSite = request.headers.get("sec-fetch-site");
  if (
    secFetchSite === "same-origin" ||
    secFetchSite === "same-site" ||
    secFetchSite === "none"
  ) {
    return true;
  }

  return process.env.NODE_ENV !== "production" && trusted.length === 0;
}

/**
 * Reject cross-site browser writes unless the caller uses Bearer auth.
 * Safe for same-origin admin UI and marketplace checkout flows.
 */
export function requireCsrfProtection(request: Request) {
  if (!isStateChangingMethod(request.method)) return null;
  if (hasBearerAuthorization(request)) return null;

  if (!isTrustedWriteOrigin(request)) {
    return jsonError({
      request,
      status: 403,
      code: "CSRF_ORIGIN_REJECTED",
      message: "Cross-site write request rejected.",
      recoveryHint:
        "Submit writes from the SlabVaultFi app origin or use Authorization: Bearer.",
    });
  }

  return null;
}
