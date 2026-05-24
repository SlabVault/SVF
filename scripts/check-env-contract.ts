/**
 * Validates environment-variable contract for local and production operations.
 *
 * Usage:
 *   npm run ops:env
 *   npm run ops:env -- --production
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

type Level = "ERROR" | "WARN";

export type EnvFinding = { level: Level; message: string };

const P0_SEC_09_EXPLICIT_FALSE =
  "TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE is explicitly false; status/list APIs trust buyerWallet query unless signed (P0-SEC-09)";
const P0_SEC_09_UNSET_DEV =
  "TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE is not set; dev defaults off — production runtime defaults on when unset (P0-SEC-09)";

function isEnvTruthy(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

export function transactionAccessSignatureFinding(
  isProductionCheck: boolean,
  txAccessFlag: string,
): EnvFinding | null {
  if (isProductionCheck) {
    if (txAccessFlag && !isEnvTruthy(txAccessFlag)) {
      return { level: "ERROR", message: P0_SEC_09_EXPLICIT_FALSE };
    }
    return null;
  }

  if (!txAccessFlag) {
    return { level: "WARN", message: P0_SEC_09_UNSET_DEV };
  }

  return null;
}

function runCheckEnvContract(argv: string[]) {
  const args = new Set(argv);
  const isProductionCheck = args.has("--production");
  const findings: EnvFinding[] = [];

  function readEnv(name: string): string {
    return process.env[name]?.trim() ?? "";
  }

  function loadDotEnvFiles() {
    const envFiles = [".env.local", ".env"];

    for (const file of envFiles) {
      const fullPath = resolve(file);
      if (!existsSync(fullPath)) continue;

      const contents = readFileSync(fullPath, "utf8");
      for (const rawLine of contents.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;

        const separatorIndex = line.indexOf("=");
        if (separatorIndex <= 0) continue;

        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        if (!key || process.env[key] !== undefined) continue;

        const unquoted =
          value.startsWith('"') && value.endsWith('"')
            ? value.slice(1, -1)
            : value.startsWith("'") && value.endsWith("'")
              ? value.slice(1, -1)
              : value;

        process.env[key] = unquoted;
      }
    }
  }

  function add(level: Level, message: string) {
    findings.push({ level, message });
  }

  function isPlaceholderSecret(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    return (
      normalized === "" ||
      normalized === "change-me" ||
      normalized === "changeme" ||
      normalized === "replace-me" ||
      normalized === "your-secret-here"
    );
  }

  function requireEnv(name: string, reason: string) {
    if (!readEnv(name)) {
      add("ERROR", `${name} missing (${reason})`);
    }
  }

  function validateSiteUrl() {
    const siteUrl = readEnv("NEXT_PUBLIC_SITE_URL");
    if (!siteUrl) return;

    try {
      const parsed = new URL(siteUrl);
      if (isProductionCheck && parsed.protocol !== "https:") {
        add("ERROR", "NEXT_PUBLIC_SITE_URL must use https in production checks");
      }
    } catch {
      add("ERROR", "NEXT_PUBLIC_SITE_URL must be a valid URL");
    }
  }

  function validateDatabaseUrl() {
    const databaseUrl = readEnv("DATABASE_URL");
    if (!databaseUrl) return;

    if (
      !databaseUrl.startsWith("postgresql://") &&
      !databaseUrl.startsWith("prisma+postgres://")
    ) {
      add(
        "WARN",
        "DATABASE_URL is not postgresql:// or prisma+postgres://; verify runtime compatibility",
      );
    }
  }

  function validateProductionSecrets() {
    const secretKeys = ["NEXTAUTH_SECRET", "ADMIN_PASSWORD", "CRON_SECRET"] as const;
    for (const key of secretKeys) {
      const value = readEnv(key);
      if (isPlaceholderSecret(value)) {
        add("ERROR", `${key} is still a placeholder value`);
      }
    }

    const adminPassword = readEnv("ADMIN_PASSWORD");
    const cronSecret = readEnv("CRON_SECRET");
    if (adminPassword && cronSecret && adminPassword === cronSecret) {
      add("WARN", "ADMIN_PASSWORD and CRON_SECRET should be different secrets");
    }

    const syncToken = readEnv("SYNC_API_TOKEN");
    if (!syncToken) {
      add(
        "WARN",
        "SYNC_API_TOKEN is not set; /api/sync bearer auth falls back to ADMIN_PASSWORD",
      );
    } else if (syncToken === adminPassword) {
      add("WARN", "SYNC_API_TOKEN should differ from ADMIN_PASSWORD");
    }
  }

  function validateTransactionAccessSignature() {
    const finding = transactionAccessSignatureFinding(
      isProductionCheck,
      readEnv("TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE"),
    );
    if (finding) add(finding.level, finding.message);
  }

  if (isProductionCheck) {
    loadDotEnvFiles();

    requireEnv("NEXT_PUBLIC_SITE_URL", "canonical URL for robots/sitemap metadata");
    requireEnv("DATABASE_URL", "marketplace and checkout persistence");
    requireEnv("NEXTAUTH_SECRET", "admin/session signing");
    requireEnv("ADMIN_PASSWORD", "admin fallback auth");
    requireEnv("CRON_SECRET", "cron-only route protection");

    const hasRpc = Boolean(
      readEnv("NEXT_PUBLIC_SOLANA_RPC_URL") ||
        readEnv("NEXT_PUBLIC_SOLANA_RPC") ||
        readEnv("SOLANA_RPC_URL") ||
        readEnv("HELIUS_API_KEY"),
    );
    if (!hasRpc) {
      add(
        "ERROR",
        "NEXT_PUBLIC_SOLANA_RPC_URL, NEXT_PUBLIC_SOLANA_RPC, SOLANA_RPC_URL, or HELIUS_API_KEY must be set",
      );
    }

    if (!isEnvTruthy(readEnv("RESERVE_REQUIRE_WALLET_CHALLENGE"))) {
      add(
        "WARN",
        "RESERVE_REQUIRE_WALLET_CHALLENGE is not true; enable in production after client rollout (P0-SEC-10)",
      );
    }

    if (!isEnvTruthy(readEnv("TRADE_TX_REQUIRE_WALLET_CHALLENGE"))) {
      add(
        "WARN",
        "TRADE_TX_REQUIRE_WALLET_CHALLENGE is not true; enable before staging trade write rehearsal (P1-WAL-05)",
      );
    }

    const hasUpstash =
      Boolean(readEnv("KV_REST_API_URL")) && Boolean(readEnv("KV_REST_API_TOKEN"));
    if (!hasUpstash) {
      add(
        "WARN",
        "KV_REST_API_URL/TOKEN not set; proxy rate limits are in-memory per instance (P0-SEC-08)",
      );
    }

    if (isEnvTruthy(readEnv("PARTNER_WEBHOOK_ENABLED"))) {
      const webhookSecret = readEnv("PARTNER_WEBHOOK_SECRET");
      if (isPlaceholderSecret(webhookSecret)) {
        add(
          "WARN",
          "PARTNER_WEBHOOK_ENABLED is true without PARTNER_WEBHOOK_SECRET; set a dedicated secret before shipping partner webhooks (P2-SEC-01)",
        );
      }
    }

    const tensorWrite = readEnv("TENSOR_TRADE_WRITE_ENABLED");
    if (isEnvTruthy(tensorWrite)) {
      add(
        "ERROR",
        "TENSOR_TRADE_WRITE_ENABLED must stay false in production (on-chain list/fill is staging-only)",
      );
      if (!isEnvTruthy(readEnv("TENSOR_TX_REQUIRE_TRUSTED_ORIGIN"))) {
        add(
          "WARN",
          "TENSOR_TRADE_WRITE_ENABLED is true without TENSOR_TX_REQUIRE_TRUSTED_ORIGIN; set TENSOR_TX_REQUIRE_TRUSTED_ORIGIN=true if trade writes are intentionally enabled",
        );
      }
      if (!isEnvTruthy(readEnv("TRADE_TX_REQUIRE_WALLET_CHALLENGE"))) {
        add(
          "WARN",
          "TENSOR_TRADE_WRITE_ENABLED is true without TRADE_TX_REQUIRE_WALLET_CHALLENGE; set TRADE_TX_REQUIRE_WALLET_CHALLENGE=true for staging hardening",
        );
      }
    }
  }

  validateSiteUrl();
  validateDatabaseUrl();
  validateProductionSecrets();
  validateTransactionAccessSignature();

  return { findings, isProductionCheck };
}

function printCheckEnvContractResult(result: ReturnType<typeof runCheckEnvContract>) {
  const { findings, isProductionCheck } = result;
  const errors = findings.filter((item) => item.level === "ERROR");
  const warnings = findings.filter((item) => item.level === "WARN");

  console.log(`[ops:env] mode=${isProductionCheck ? "production" : "default"}`);

  for (const finding of findings) {
    console.log(`[${finding.level}] ${finding.message}`);
  }

  if (errors.length) {
    console.error(`\n[ops:env] failed with ${errors.length} error(s).`);
    process.exit(1);
  }

  if (warnings.length) {
    console.log(`\n[ops:env] passed with ${warnings.length} warning(s).`);
  } else {
    console.log("\n[ops:env] passed with no warnings.");
  }
}

export { runCheckEnvContract };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  printCheckEnvContractResult(runCheckEnvContract(process.argv.slice(2)));
}
