import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Authorize POST /api/sync for Vercel cron (CRON_SECRET), CLI/scripts
 * (x-admin-password), or an authenticated admin session.
 */
export async function isSyncAuthorized(
  request: NextRequest,
): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader === `Bearer ${cronSecret}`) return true;

    const cronHeader = request.headers.get("x-cron-secret");
    if (cronHeader === cronSecret) return true;
  }

  if (adminPassword) {
    const adminHeader = request.headers.get("x-admin-password");
    if (adminHeader === adminPassword) return true;
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (token?.sub === "admin") return true;

  return false;
}
