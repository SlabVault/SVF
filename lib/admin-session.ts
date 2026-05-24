import type { JWT } from "next-auth/jwt";

/** Default role for legacy admin sessions missing an explicit JWT role claim. */
export const DEFAULT_ADMIN_SESSION_ROLE = "admin";

/** Role assigned to new admin JWT sessions (`ADMIN_SESSION_ROLE` override). */
export function resolveAdminSessionRole(): string {
  const configured = process.env.ADMIN_SESSION_ROLE?.trim();
  return configured || DEFAULT_ADMIN_SESSION_ROLE;
}

/** Validates an admin NextAuth JWT (subject + expiry). */
export function isValidAdminSessionToken(token: JWT | null | undefined): boolean {
  if (!token?.sub || token.sub !== "admin") return false;
  if (typeof token.exp === "number" && token.exp * 1000 <= Date.now()) return false;
  return true;
}

/** Reads the admin role from a valid session JWT; legacy tokens default to admin. */
export function getAdminRoleFromToken(token: JWT | null | undefined): string | null {
  if (!isValidAdminSessionToken(token)) return null;
  const role =
    typeof token?.role === "string" && token.role.trim().length > 0
      ? token.role.trim()
      : DEFAULT_ADMIN_SESSION_ROLE;
  return role;
}

/** Returns true when the JWT session carries one of the allowed admin roles. */
export function tokenHasAdminRole(
  token: JWT | null | undefined,
  allowedRoles: string[],
): boolean {
  const role = getAdminRoleFromToken(token);
  if (!role) return false;
  return allowedRoles.includes(role);
}
