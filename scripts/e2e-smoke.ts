/**
 * Lightweight HTTP smoke checks for post-deploy verification.
 * Complements unit tests — no browser or production secrets required.
 *
 * Usage:
 *   npm run e2e:smoke
 *   npm run e2e:smoke -- --base-url http://localhost:3000
 */

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

async function checkRoute(
  baseUrl: string,
  path: string,
  expectedStatus = 200,
): Promise<CheckResult> {
  const response = await fetch(new URL(path, baseUrl), {
    redirect: "manual",
  });

  if (response.status !== expectedStatus) {
    return {
      ok: false,
      message: `${path} expected ${expectedStatus}, got ${response.status}`,
    };
  }

  return { ok: true, message: `${path} returned ${expectedStatus}` };
}

async function main() {
  const { baseUrl } = parseArgs();
  console.log(`[e2e:smoke] base=${baseUrl}`);

  const checks = await Promise.all([
    checkRoute(baseUrl, "/"),
    checkRoute(baseUrl, "/vault/shop", 308),
    checkRoute(baseUrl, "/marketplace", 308),
    checkRoute(baseUrl, "/discover", 308),
    checkRoute(baseUrl, "/trade", 200),
    checkRoute(baseUrl, "/vault"),
    checkRoute(baseUrl, "/pulls"),
    checkRoute(baseUrl, "/faq"),
    checkRoute(baseUrl, "/robots.txt"),
    checkRoute(baseUrl, "/vault/purchases", 308),
    checkRoute(baseUrl, "/trade/portfolio", 200),
    checkRoute(baseUrl, "/marketplace/orders", 308),
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
    console.error(`\n[e2e:smoke] failed (${failures} check(s)).`);
    process.exit(1);
  }

  console.log("\n[e2e:smoke] all checks passed.");
}

main().catch((error) => {
  console.error("[e2e:smoke] unexpected error", error);
  process.exit(1);
});
