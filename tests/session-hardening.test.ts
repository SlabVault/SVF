import assert from "node:assert/strict";
import test from "node:test";

import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  ADMIN_SESSION_UPDATE_AGE_SECONDS,
  authOptions,
} from "../lib/auth";
import { requireAuth, requireAdminRole, requireWriteAuth } from "../lib/admin-auth";
import {
  DEFAULT_ADMIN_SESSION_ROLE,
  getAdminRoleFromToken,
  isValidAdminSessionToken,
  resolveAdminSessionRole,
  tokenHasAdminRole,
} from "../lib/admin-session";
import { withTemporaryEnv } from "./helpers/test-helpers";

test("authOptions uses short-lived admin JWT session settings", () => {
  assert.equal(authOptions.session?.strategy, "jwt");
  assert.equal(authOptions.session?.maxAge, ADMIN_SESSION_MAX_AGE_SECONDS);
  assert.equal(authOptions.session?.updateAge, ADMIN_SESSION_UPDATE_AGE_SECONDS);
  assert.equal(authOptions.jwt?.maxAge, ADMIN_SESSION_MAX_AGE_SECONDS);
  assert.equal(ADMIN_SESSION_MAX_AGE_SECONDS, 8 * 60 * 60);
  assert.equal(ADMIN_SESSION_UPDATE_AGE_SECONDS, 60 * 60);
  assert.equal(authOptions.cookies?.sessionToken?.options?.httpOnly, true);
  assert.equal(authOptions.cookies?.sessionToken?.options?.sameSite, "lax");
});

test("isValidAdminSessionToken rejects expired admin tokens", () => {
  assert.equal(
    isValidAdminSessionToken({
      sub: "admin",
      exp: Math.floor(Date.now() / 1000) - 60,
    }),
    false,
  );
  assert.equal(
    isValidAdminSessionToken({
      sub: "admin",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
    true,
  );
  assert.equal(isValidAdminSessionToken({ sub: "not-admin" }), false);
});

test("resolveAdminSessionRole defaults to admin and honors ADMIN_SESSION_ROLE", async () => {
  await withTemporaryEnv({ ADMIN_SESSION_ROLE: undefined }, () => {
    assert.equal(resolveAdminSessionRole(), DEFAULT_ADMIN_SESSION_ROLE);
  });

  await withTemporaryEnv({ ADMIN_SESSION_ROLE: "operator" }, () => {
    assert.equal(resolveAdminSessionRole(), "operator");
  });
});

test("getAdminRoleFromToken defaults missing role to admin for legacy sessions", () => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  assert.equal(getAdminRoleFromToken({ sub: "admin", exp }), DEFAULT_ADMIN_SESSION_ROLE);
  assert.equal(
    getAdminRoleFromToken({ sub: "admin", exp, role: "viewer" }),
    "viewer",
  );
  assert.equal(getAdminRoleFromToken({ sub: "not-admin", exp }), null);
});

test("tokenHasAdminRole enforces allowed role list", () => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const adminToken = { sub: "admin", exp };
  const viewerToken = { sub: "admin", exp, role: "viewer" };

  assert.equal(tokenHasAdminRole(adminToken, ["admin"]), true);
  assert.equal(tokenHasAdminRole(viewerToken, ["admin"]), false);
  assert.equal(tokenHasAdminRole(viewerToken, ["viewer", "admin"]), true);
});

test("requireAdminRole allows bearer fallback without JWT role", async () => {
  await withTemporaryEnv({ ADMIN_PASSWORD: "secret" }, async () => {
    const request = new Request("http://localhost/api/admin/transactions/tx_1/fulfill", {
      headers: { authorization: "Bearer secret" },
    });
    const response = await requireAdminRole(request as never, ["admin"]);
    assert.equal(response, null);
  });
});

test("requireWriteAuth rejects untrusted cross-site writes before auth", async () => {
  await withTemporaryEnv(
    {
      ADMIN_PASSWORD: "secret",
      NEXT_PUBLIC_SITE_URL: "https://slabvault.xyz",
      NODE_ENV: "production",
    },
    async () => {
      const request = new Request("http://localhost/api/admin/pricing", {
        method: "POST",
        headers: {
          origin: "https://evil.example",
          "content-type": "application/json",
        },
        body: JSON.stringify({ slabId: "slab_1" }),
      });

      const response = await requireWriteAuth(request);
      assert.ok(response);
      assert.equal(response.status, 403);

      const body = await response.json();
      assert.equal(body.code, "CSRF_ORIGIN_REJECTED");
    },
  );
});

test("requireAuth returns structured unauthorized envelope", async () => {
  await withTemporaryEnv(
    {
      ADMIN_PASSWORD: "secret",
      NEXTAUTH_SECRET: "next-auth-secret",
    },
    async () => {
      const request = new Request("http://localhost/api/admin/ops-status");
      const response = await requireAuth(request);
      assert.ok(response);

      const body = await response.json();
      assert.equal(response.status, 401);
      assert.equal(body.ok, false);
      assert.equal(body.code, "ADMIN_AUTH_UNAUTHORIZED");
      assert.equal(body.error, "Unauthorized");
      assert.match(String(response.headers.get("www-authenticate")), /bearer/i);
    },
  );
});

test("requireAuth returns structured not-configured envelope", async () => {
  await withTemporaryEnv(
    {
      ADMIN_PASSWORD: undefined,
      NEXTAUTH_SECRET: "next-auth-secret",
    },
    async () => {
      const request = new Request("http://localhost/api/admin/ops-status");
      const response = await requireAuth(request);
      assert.ok(response);

      const body = await response.json();
      assert.equal(response.status, 503);
      assert.equal(body.code, "ADMIN_AUTH_NOT_CONFIGURED");
    },
  );
});
