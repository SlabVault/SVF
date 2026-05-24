import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isValidAdminSessionToken } from "@/lib/admin-session";
import { checkRateLimit } from "@/lib/security";

/** Per-IP requests per minute for proxy rate limiting (60s window in proxy). */
export const PROXY_API_RATE_LIMIT_AUTH = 20;
export const PROXY_API_RATE_LIMIT_TRADE_TX = PROXY_API_RATE_LIMIT_AUTH;
export const PROXY_API_RATE_LIMIT_DEFAULT = 100;

/** True for GRAILS Tensor tx BFF paths under `/api/trade/tx/`. */
export function isProxyTradeTxApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/trade/tx/");
}

/** Resolve per-minute cap for `/api/*` paths handled by proxy rate limiting. */
export function resolveProxyApiRateLimit(pathname: string): number {
  if (pathname.startsWith("/api/auth")) {
    return PROXY_API_RATE_LIMIT_AUTH;
  }
  if (isProxyTradeTxApiRoute(pathname)) {
    return PROXY_API_RATE_LIMIT_TRADE_TX;
  }
  return PROXY_API_RATE_LIMIT_DEFAULT;
}

export function resolveProxyRateLimitScope(pathname: string): "auth" | "trade-tx" | "api" {
  if (pathname.startsWith("/api/auth")) return "auth";
  if (isProxyTradeTxApiRoute(pathname)) return "trade-tx";
  return "api";
}

/**
 * Proxy for rate limiting, admin session guard, and security headers.
 * Matcher is limited to /api and /admin so /, static assets, and metadata routes
 * (/icon, /favicon.ico, /_next/*) are never intercepted.
 */
export async function proxy(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;

    // Never run proxy logic for Next internals or static files (defense in depth).
    if (
      pathname.startsWith("/_next") ||
      pathname === "/favicon.ico" ||
      pathname.startsWith("/icon") ||
      pathname.startsWith("/apple-icon")
    ) {
      return NextResponse.next();
    }

    if (
      pathname.startsWith("/admin") &&
      !pathname.startsWith("/admin/login") &&
      !pathname.startsWith("/api/auth")
    ) {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });
      if (!isValidAdminSessionToken(token)) {
        const loginUrl = new URL("/admin/login", request.url);
        loginUrl.searchParams.set(
          "callbackUrl",
          `${pathname}${request.nextUrl.search}`,
        );
        const redirect = NextResponse.redirect(loginUrl);
        if (token && !isValidAdminSessionToken(token)) {
          redirect.cookies.set("next-auth.session-token", "", {
            maxAge: 0,
            path: "/",
          });
          redirect.cookies.set("__Secure-next-auth.session-token", "", {
            maxAge: 0,
            path: "/",
          });
        }
        return redirect;
      }
    }

    const response = NextResponse.next();
    const isAuthApiRoute = pathname.startsWith("/api/auth");
    const isTradeTxApiRoute = isProxyTradeTxApiRoute(pathname);
    const isStrictApiRateLimitRoute = isAuthApiRoute || isTradeTxApiRoute;
    const isSensitiveRoute =
      pathname.startsWith("/admin") ||
      pathname.startsWith("/api/admin") ||
      isStrictApiRateLimitRoute;

    response.headers.set("X-DNS-Prefetch-Control", "off");
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
    response.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
    response.headers.set("Origin-Agent-Cluster", "?1");
    if (request.nextUrl.protocol === "https:") {
      response.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains",
      );
    }
    if (isSensitiveRoute) {
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
    }

    if (pathname.startsWith("/api/")) {
      const limit = resolveProxyApiRateLimit(pathname);
      const clientIp =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip")?.trim() ||
        "unknown";
      const identifier = `${resolveProxyRateLimitScope(pathname)}:${clientIp}`;

      try {
        const rateLimit = await checkRateLimit(identifier, limit, 60_000);

        if (!rateLimit.allowed) {
          return new NextResponse("Too many requests", { status: 429 });
        }

        response.headers.set("X-RateLimit-Limit", String(limit));
        response.headers.set(
          "X-RateLimit-Remaining",
          String(rateLimit.remaining),
        );
        response.headers.set("X-RateLimit-Reset", String(rateLimit.resetTime));
      } catch (error) {
        console.error("[proxy] rate limit check failed:", error);
        return new NextResponse("Service unavailable", { status: 503 });
      }
    }

    return response;
  } catch (error) {
    console.error("[proxy] unhandled error:", error);
    return new NextResponse("Service unavailable", { status: 503 });
  }
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*"],
};
