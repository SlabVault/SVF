/**
 * Lightweight operator checks for deployment hardening.
 *
 * Usage:
 *   npm run ops:verify
 *   npm run ops:verify -- --base-url https://slabvault.xyz
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

type CheckResult = { ok: true; message: string } | { ok: false; message: string };

function parseArgs() {
  const args = process.argv.slice(2);
  let baseUrl = process.env.OPS_BASE_URL?.trim();

  for (let i = 0; i < args.length; i += 1) {
    if (!args[i].startsWith("-") && !baseUrl) {
      baseUrl = args[i]?.trim();
      continue;
    }

    if (args[i] === "--base-url") {
      baseUrl = args[i + 1]?.trim();
      i += 1;
    }
  }

  return {
    baseUrl:
      baseUrl ||
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      "http://localhost:3000",
  };
}

async function checkVercelCronContract(): Promise<CheckResult> {
  try {
    const vercelJson = await readFile(resolve("vercel.json"), "utf8");
    const parsed = JSON.parse(vercelJson) as {
      crons?: Array<{ path?: string; schedule?: string }>;
    };
    const cronPaths = new Set((parsed.crons ?? []).map((entry) => entry.path));
    const required = ["/api/sync", "/api/cron/expire-reservations"];
    const missing = required.filter((path) => !cronPaths.has(path));

    if (missing.length) {
      return {
        ok: false,
        message: `vercel.json missing cron paths: ${missing.join(", ")}`,
      };
    }

    return {
      ok: true,
      message: "vercel.json cron paths cover sync and reservation expiry",
    };
  } catch (error) {
    return {
      ok: false,
      message: `failed reading vercel.json: ${String(error)}`,
    };
  }
}

async function checkRobots(baseUrl: string): Promise<CheckResult> {
  const response = await fetch(new URL("/robots.txt", baseUrl));
  const body = await response.text();

  if (!response.ok) {
    return { ok: false, message: `robots returned ${response.status}` };
  }

  const requiredRules = ["Disallow: /admin", "Disallow: /api"];
  const missing = requiredRules.filter((rule) => !body.includes(rule));
  if (missing.length) {
    return {
      ok: false,
      message: `robots missing rules: ${missing.join(", ")}`,
    };
  }

  return { ok: true, message: "robots blocks /admin and /api" };
}

async function checkSyncUnauthorized(baseUrl: string): Promise<CheckResult> {
  const response = await fetch(new URL("/api/sync", baseUrl));
  const challenge = response.headers.get("www-authenticate") ?? "";

  if (response.status !== 401) {
    return { ok: false, message: `/api/sync expected 401, got ${response.status}` };
  }

  if (!challenge.toLowerCase().includes("bearer")) {
    return {
      ok: false,
      message: "/api/sync 401 missing WWW-Authenticate bearer challenge",
    };
  }

  return { ok: true, message: "/api/sync denies anonymous requests with bearer challenge" };
}

async function checkCronUnauthorized(baseUrl: string): Promise<CheckResult> {
  const response = await fetch(new URL("/api/cron/expire-reservations", baseUrl), {
    method: "POST",
  });
  const challenge = response.headers.get("www-authenticate") ?? "";

  if (response.status !== 401) {
    return {
      ok: false,
      message: `/api/cron/expire-reservations expected 401, got ${response.status}`,
    };
  }

  if (!challenge.toLowerCase().includes("bearer")) {
    return {
      ok: false,
      message: "/api/cron/expire-reservations 401 missing bearer challenge",
    };
  }

  return {
    ok: true,
    message: "/api/cron/expire-reservations rejects anonymous POST with bearer challenge",
  };
}

async function main() {
  const { baseUrl } = parseArgs();
  console.log(`[ops:verify] base=${baseUrl}`);

  const checks = await Promise.all([
    checkVercelCronContract(),
    checkRobots(baseUrl),
    checkSyncUnauthorized(baseUrl),
    checkCronUnauthorized(baseUrl),
  ]);

  let failures = 0;
  for (const check of checks) {
    if (check.ok) {
      console.log(`[PASS] ${check.message}`);
    } else {
      failures += 1;
      console.error(`[FAIL] ${check.message}`);
    }
  }

  if (failures > 0) {
    console.error(`\n[ops:verify] failed (${failures} check(s)).`);
    process.exit(1);
  }

  console.log("\n[ops:verify] all checks passed.");
}

main().catch((error) => {
  console.error("[ops:verify] unexpected error", error);
  process.exit(1);
});
