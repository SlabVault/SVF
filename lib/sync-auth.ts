import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { jsonError } from "@/lib/api-errors";
import { isValidAdminSessionToken } from "@/lib/admin-session";
import { bearerChallengeHeader, validateBearerToken } from "@/lib/http-auth";

/**
 * Authorize /api/sync for Vercel cron (CRON_SECRET) or authenticated admin.
 */
export async function isSyncAuthorized(
  request: NextRequest,
): Promise<boolean> {
  const authorization = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();
  const syncToken = process.env.SYNC_API_TOKEN?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();

  if (cronSecret && validateBearerToken(authorization, cronSecret) === "valid") {
    return true;
  }

  if (syncToken && validateBearerToken(authorization, syncToken) === "valid") {
    return true;
  }

  // Backward compatibility: existing operators may still use ADMIN_PASSWORD as a bearer token.
  if (adminPassword && validateBearerToken(authorization, adminPassword) === "valid") {
    return true;
  }

  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (isValidAdminSessionToken(token)) return true;
  } catch (error) {
    console.error("[sync-auth] session validation failed:", error);
  }

  return false;
}

function syncAuthConfigured(): boolean {
  return Boolean(
    process.env.CRON_SECRET?.trim() ||
      process.env.SYNC_API_TOKEN?.trim() ||
      process.env.ADMIN_PASSWORD?.trim() ||
      process.env.NEXTAUTH_SECRET?.trim(),
  );
}

/** Structured sync/cron auth guard with api-errors envelope. */
export async function requireSyncAuth(request: NextRequest) {
  if (await isSyncAuthorized(request)) {
    return null;
  }

  if (!syncAuthConfigured()) {
    return jsonError({
      request,
      status: 503,
      code: "SYNC_AUTH_NOT_CONFIGURED",
      message: "Sync authentication is not configured.",
      recoveryHint:
        "Set CRON_SECRET, SYNC_API_TOKEN, or ADMIN_PASSWORD with NEXTAUTH_SECRET.",
    });
  }

  return jsonError({
    request,
    status: 401,
    code: "SYNC_UNAUTHORIZED",
    message: "Unauthorized",
    recoveryHint:
      "Provide Authorization: Bearer <CRON_SECRET|SYNC_API_TOKEN> or sign in as admin.",
    headers: bearerChallengeHeader(),
  });
}

/** Structured cron bearer guard with api-errors envelope. */
export function requireCronAuth(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return jsonError({
      request,
      status: 503,
      code: "CRON_AUTH_NOT_CONFIGURED",
      message: "CRON_SECRET is not configured.",
      recoveryHint: "Set CRON_SECRET for cron invocations.",
    });
  }

  if (
    validateBearerToken(request.headers.get("authorization"), cronSecret) !==
    "valid"
  ) {
    return jsonError({
      request,
      status: 401,
      code: "CRON_EXPIRE_RESERVATIONS_UNAUTHORIZED",
      message: "Unauthorized",
      recoveryHint: "Provide Authorization: Bearer <CRON_SECRET> for cron invocations.",
      headers: bearerChallengeHeader(),
    });
  }

  return null;
}
