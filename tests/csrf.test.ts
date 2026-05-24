import assert from "node:assert/strict";
import test from "node:test";

import {
  getTrustedOrigins,
  hasBearerAuthorization,
  isTrustedWriteOrigin,
  requireCsrfProtection,
} from "../lib/csrf";
import { withTemporaryEnv } from "./helpers/test-helpers";

test("hasBearerAuthorization detects bearer scheme", () => {
  const request = new Request("http://localhost/api/admin/slabs", {
    headers: { authorization: "Bearer secret" },
  });
  assert.equal(hasBearerAuthorization(request), true);
});

test("requireCsrfProtection skips bearer-authenticated writes", async () => {
  await withTemporaryEnv(
    {
      NEXT_PUBLIC_SITE_URL: "https://slabvault.xyz",
      NODE_ENV: "production",
    },
    () => {
      const request = new Request("http://localhost/api/admin/slabs", {
        method: "POST",
        headers: {
          authorization: "Bearer secret",
          origin: "https://evil.example",
        },
      });

      assert.equal(requireCsrfProtection(request), null);
    },
  );
});

test("requireCsrfProtection rejects untrusted cross-site writes in production", async () => {
  await withTemporaryEnv(
    {
      NEXT_PUBLIC_SITE_URL: "https://slabvault.xyz",
      NODE_ENV: "production",
    },
    async () => {
      const request = new Request("http://localhost/api/admin/slabs", {
        method: "POST",
        headers: { origin: "https://evil.example" },
      });

      const response = requireCsrfProtection(request);
      assert.ok(response);
      assert.equal(response.status, 403);

      const body = await response.json();
      assert.equal(body.code, "CSRF_ORIGIN_REJECTED");
      assert.equal(body.ok, false);
    },
  );
});

test("isTrustedWriteOrigin accepts configured site origin", () => {
  withTemporaryEnv(
    {
      NEXT_PUBLIC_SITE_URL: "https://slabvault.xyz",
      NODE_ENV: "production",
    },
    () => {
      const request = new Request("http://localhost/api/admin/slabs", {
        method: "POST",
        headers: { origin: "https://slabvault.xyz" },
      });

      assert.equal(isTrustedWriteOrigin(request), true);
      assert.deepEqual(getTrustedOrigins(), ["https://slabvault.xyz"]);
    },
  );
});
