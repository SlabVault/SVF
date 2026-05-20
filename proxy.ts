import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit } from "@/lib/security";

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
      if (!token) {
        const loginUrl = new URL("/admin/login", request.url);
        loginUrl.searchParams.set(
          "callbackUrl",
          `${pathname}${request.nextUrl.search}`,
        );
        return NextResponse.redirect(loginUrl);
      }
    }

    const response = NextResponse.next();

    response.headers.set("X-DNS-Prefetch-Control", "off");
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );

    if (pathname.startsWith("/api/")) {
      const identifier =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip")?.trim() ||
        "unknown";

      try {
        const rateLimit = checkRateLimit(identifier, 100, 60_000);

        if (!rateLimit.allowed) {
          return new NextResponse("Too many requests", { status: 429 });
        }

        response.headers.set("X-RateLimit-Limit", "100");
        response.headers.set(
          "X-RateLimit-Remaining",
          String(rateLimit.remaining),
        );
        response.headers.set("X-RateLimit-Reset", String(rateLimit.resetTime));
      } catch (error) {
        console.error("[proxy] rate limit check failed:", error);
      }
    }

    return response;
  } catch (error) {
    console.error("[proxy] unhandled error:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*"],
};
