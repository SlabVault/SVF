import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { checkRateLimit } from "../lib/security";
import { withTemporaryEnv } from "./helpers/test-helpers";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("checkRateLimit uses Upstash when KV_REST_API_URL and TOKEN are set", async () => {
  const fetchUrls: string[] = [];

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    fetchUrls.push(url);
    assert.equal(init?.method, "POST");
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("Authorization"), "Bearer test-upstash-token");

    if (url.includes("/incr/")) {
      return new Response(JSON.stringify({ result: 3 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/expire/")) {
      return new Response(JSON.stringify({ result: 1 }), { status: 200 });
    }
    return new Response("unexpected", { status: 404 });
  };

  await withTemporaryEnv(
    {
      KV_REST_API_URL: "https://kv.test.upstash.io",
      KV_REST_API_TOKEN: "test-upstash-token",
    },
    async () => {
      const id = `upstash-${Date.now()}`;
      const result = await checkRateLimit(id, 10, 60_000);

      assert.equal(result.allowed, true);
      assert.equal(result.remaining, 7);
      assert.equal(fetchUrls.length, 2);
      assert.ok(fetchUrls.some((u) => u.includes("/incr/") && u.includes("ratelimit")));
      assert.ok(fetchUrls.some((u) => u.includes("/expire/") && u.includes("ratelimit")));
      assert.ok(fetchUrls.every((u) => u.startsWith("https://kv.test.upstash.io")));
    },
  );
});

test("checkRateLimit denies when Upstash incr count exceeds maxRequests", async () => {
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/incr/")) {
      return new Response(JSON.stringify({ result: 11 }), { status: 200 });
    }
    return new Response(JSON.stringify({ result: 1 }), { status: 200 });
  };

  await withTemporaryEnv(
    {
      KV_REST_API_URL: "https://kv.test.upstash.io",
      KV_REST_API_TOKEN: "test-upstash-token",
    },
    async () => {
      const result = await checkRateLimit(`upstash-deny-${Date.now()}`, 10, 60_000);
      assert.equal(result.allowed, false);
      assert.equal(result.remaining, 0);
    },
  );
});

test("checkRateLimit falls back to in-memory when KV env is unset", async () => {
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("fetch must not run without KV env");
  };

  await withTemporaryEnv(
    {
      KV_REST_API_URL: undefined,
      KV_REST_API_TOKEN: undefined,
    },
    async () => {
      const id = `memory-unset-${Date.now()}`;
      const result = await checkRateLimit(id, 5, 60_000);

      assert.equal(fetchCalled, false);
      assert.equal(result.allowed, true);
      assert.equal(result.remaining, 4);
    },
  );
});

test("checkRateLimit falls back to in-memory when Upstash fetch is not ok", async () => {
  globalThis.fetch = async () => new Response("error", { status: 500 });

  await withTemporaryEnv(
    {
      KV_REST_API_URL: "https://kv.test.upstash.io",
      KV_REST_API_TOKEN: "test-upstash-token",
    },
    async () => {
      const id = `memory-fallback-${Date.now()}`;
      const result = await checkRateLimit(id, 8, 60_000);

      assert.equal(result.allowed, true);
      assert.equal(result.remaining, 7);
    },
  );
});
