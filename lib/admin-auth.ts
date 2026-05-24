import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { jsonError } from "@/lib/api-errors";
import {
  DEFAULT_ADMIN_SESSION_ROLE,
  isValidAdminSessionToken,
  tokenHasAdminRole,
} from "@/lib/admin-session";
import { requireCsrfProtection } from "@/lib/csrf";
import { bearerChallengeHeader, validateBearerToken } from "@/lib/http-auth";

export async function requireAuth(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  const authHeader = request.headers.get("authorization");

  if (adminPassword && validateBearerToken(authHeader, adminPassword) === "valid") {
    return null;
  }

  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (isValidAdminSessionToken(token)) {
      return null;
    }

    if (token && !isValidAdminSessionToken(token)) {
      return jsonError({
        request,
        status: 401,
        code: "ADMIN_AUTH_SESSION_INVALID",
        message: "Admin session is invalid or expired.",
        recoveryHint: "Sign in again at /admin/login.",
      });
    }
  } catch (error) {
    console.error("[admin-auth] session validation failed:", error);
    return jsonError({
      request,
      status: 503,
      code: "ADMIN_AUTH_SESSION_VALIDATION_FAILED",
      message: "Admin session validation failed.",
      recoveryHint: "Verify NEXTAUTH_SECRET is configured and stable across deploys.",
      details: {
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    });
  }

  if (!adminPassword) {
    return jsonError({
      request,
      status: 503,
      code: "ADMIN_AUTH_NOT_CONFIGURED",
      message: "ADMIN_PASSWORD not configured",
      recoveryHint: "Set ADMIN_PASSWORD and NEXTAUTH_SECRET for admin access.",
    });
  }

  return jsonError({
    request,
    status: 401,
    code: "ADMIN_AUTH_UNAUTHORIZED",
    message: "Unauthorized",
    recoveryHint: "Sign in at /admin/login or provide Authorization: Bearer <ADMIN_PASSWORD>.",
    headers: bearerChallengeHeader(),
  });
}

/** Auth + CSRF for state-changing admin/marketplace write routes. */
export async function requireWriteAuth(request: NextRequest) {
  const csrfError = requireCsrfProtection(request);
  if (csrfError) return csrfError;

  return requireAuth(request);
}

/**
 * Role gate for admin handlers — bearer fallback retains full access;
 * JWT sessions must carry one of `roles` (legacy sessions default to admin).
 */
export async function requireAdminRole(request: NextRequest, roles: string[]) {
  const allowedRoles =
    roles.length > 0 ? roles : [DEFAULT_ADMIN_SESSION_ROLE];

  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  const authHeader = request.headers.get("authorization");
  if (adminPassword && validateBearerToken(authHeader, adminPassword) === "valid") {
    return null;
  }

  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (tokenHasAdminRole(token, allowedRoles)) {
      return null;
    }

    if (isValidAdminSessionToken(token)) {
      return jsonError({
        request,
        status: 403,
        code: "ADMIN_FORBIDDEN",
        message: "Admin role not authorized for this action.",
        recoveryHint: "Sign in with an account that has the required admin role.",
        details: { requiredRoles: allowedRoles },
      });
    }
  } catch (error) {
    console.error("[admin-auth] role validation failed:", error);
    return jsonError({
      request,
      status: 503,
      code: "ADMIN_AUTH_SESSION_VALIDATION_FAILED",
      message: "Admin session validation failed.",
      recoveryHint: "Verify NEXTAUTH_SECRET is configured and stable across deploys.",
      details: {
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    });
  }

  return jsonError({
    request,
    status: 403,
    code: "ADMIN_FORBIDDEN",
    message: "Admin role not authorized for this action.",
    recoveryHint: "Sign in with an account that has the required admin role.",
    details: { requiredRoles: allowedRoles },
  });
}
