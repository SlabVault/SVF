import { getExternalListingsDbSyncLeg, type ExternalListingsDbSyncLeg } from "@/lib/data-sync";
import {
  databaseUrlProtocolRemediation,
  databaseUrlUnreachableHint,
  isDatabaseUrlProtocolIncompatible,
  isDirectPostgresDatabaseUrl,
  isPrismaProxyDatabaseUrl,
} from "@/lib/db-connection";
import { getExternalListingSeedStats } from "@/lib/external-listings";
import { getRecentOperatorFailures, type OperatorFailure } from "@/lib/operator-diagnostics";
import { inspectSchemaHealth } from "@/lib/schema-health";
import { isReserveWalletChallengeRequired } from "@/lib/wallet-challenge";

export type OpsCheckStatus = "pass" | "warn" | "fail" | "unknown";

export type OpsCheck = {
  key: string;
  label: string;
  status: OpsCheckStatus;
  detail: string;
  remediation?: string;
};

export type AdminOpsStatus = {
  generatedAt: string;
  checks: OpsCheck[];
  schemaSeverity: string;
  recentFailures: OperatorFailure[];
  remediationPointers: string[];
};

function requireEnvValue(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function parseDatabaseUrlProtocolStatus(databaseUrl: string | null): OpsCheck {
  if (!databaseUrl) {
    return {
      key: "database-url-protocol",
      label: "DATABASE_URL protocol",
      status: "unknown",
      detail: "DATABASE_URL not configured; protocol compatibility not checked.",
    };
  }

  if (isDatabaseUrlProtocolIncompatible(databaseUrl)) {
    return {
      key: "database-url-protocol",
      label: "DATABASE_URL protocol",
      status: "warn",
      detail: `${databaseUrlUnreachableHint(databaseUrl)} ExternalListing DB upsert is skipped until the protocol matches the generated Prisma Client.`,
      remediation: databaseUrlProtocolRemediation(databaseUrl),
    };
  }

  const protocolLabel = isPrismaProxyDatabaseUrl(databaseUrl)
    ? "prisma+postgres:// (Prisma proxy / Accelerate)"
    : isDirectPostgresDatabaseUrl(databaseUrl)
      ? "postgresql:// (direct Postgres)"
      : "supported protocol";

  return {
    key: "database-url-protocol",
    label: "DATABASE_URL protocol",
    status: "pass",
    detail: `Protocol compatible with generated Prisma Client (${protocolLabel}).`,
  };
}

function parseSiteUrlStatus(): OpsCheck {
  const siteUrl = requireEnvValue("NEXT_PUBLIC_SITE_URL");
  if (!siteUrl) {
    return {
      key: "next-public-site-url",
      label: "NEXT_PUBLIC_SITE_URL",
      status: "warn",
      detail: "Not configured; metadata URLs may fallback incorrectly.",
      remediation: "Set NEXT_PUBLIC_SITE_URL to your canonical HTTPS origin.",
    };
  }

  try {
    const parsed = new URL(siteUrl);
    if (parsed.protocol !== "https:") {
      return {
        key: "next-public-site-url",
        label: "NEXT_PUBLIC_SITE_URL",
        status: "warn",
        detail: `Configured as ${siteUrl}, but not HTTPS.`,
        remediation: "Use an https:// URL for production safety and trust.",
      };
    }
  } catch {
    return {
      key: "next-public-site-url",
      label: "NEXT_PUBLIC_SITE_URL",
      status: "fail",
      detail: "Configured value is not a valid URL.",
      remediation: "Set NEXT_PUBLIC_SITE_URL to a valid https:// URL.",
    };
  }

  return {
    key: "next-public-site-url",
    label: "NEXT_PUBLIC_SITE_URL",
    status: "pass",
    detail: "Configured with a valid HTTPS URL.",
  };
}

function summarizeChecks(checks: OpsCheck[]): string[] {
  const failCount = checks.filter((check) => check.status === "fail").length;
  const warnCount = checks.filter((check) => check.status === "warn").length;
  const pointers: string[] = [];

  if (failCount > 0) {
    pointers.push(`Resolve ${failCount} failing ops check(s) before production deploys.`);
  }
  if (warnCount > 0) {
    pointers.push(`Address ${warnCount} warning check(s) to reduce operator toil.`);
  }
  if (failCount === 0 && warnCount === 0) {
    pointers.push("Ops checks are green. Continue with periodic preflight verification.");
  }

  for (const check of checks) {
    if (check.remediation && (check.status === "warn" || check.status === "fail")) {
      pointers.push(`${check.label}: ${check.remediation}`);
    }
  }

  return pointers;
}

function formatCcIngestSourceSuffix(
  ccIngestSource: ExternalListingsDbSyncLeg["ccIngestSource"],
): string {
  return ccIngestSource ? ` CC ingest: ${ccIngestSource}.` : "";
}

async function buildExternalListingsDbSyncCheck(
  databaseUrl: string | null,
): Promise<OpsCheck> {
  const leg = await getExternalListingsDbSyncLeg();
  const base = {
    key: "external-listings-db-sync",
    label: "External listings DB sync",
  };

  if (!databaseUrl) {
    return {
      ...base,
      status: "unknown",
      detail: "DATABASE_URL not configured; Postgres upsert leg is inactive.",
    };
  }

  if (!leg.lastAttemptAt) {
    return {
      ...base,
      status: "warn",
      detail:
        "No external listings sync recorded; last Postgres upsert count unknown.",
      remediation:
        "Run npm run sync:discover (or npm run sync) to upsert ExternalListing rows.",
    };
  }

  const zeroUpserts = leg.dbUpsertCount === 0 || leg.dbUpsertCount === null;
  const hasUpsertErrors = leg.upsertErrors.length > 0;

  if (zeroUpserts || hasUpsertErrors) {
    const parts: string[] = [];
    if (zeroUpserts) {
      parts.push(`last dbUpsertCount=${leg.dbUpsertCount ?? 0}`);
    }
    if (hasUpsertErrors) {
      parts.push(`upsert errors: ${leg.upsertErrors.join("; ")}`);
    }

    return {
      ...base,
      status: "warn",
      detail: `Postgres upsert leg unhealthy (${parts.join("; ")}). Last attempt ${leg.lastAttemptAt}.${formatCcIngestSourceSuffix(leg.ccIngestSource)}`,
      remediation:
        "Verify DATABASE_URL, run npm run db:preflight, then npm run sync:discover. Check ExternalListing migration.",
    };
  }

  return {
    ...base,
    status: "pass",
    detail: `Last sync upserted ${leg.dbUpsertCount} ExternalListing row(s) at ${leg.lastAttemptAt}.${formatCcIngestSourceSuffix(leg.ccIngestSource)}`,
  };
}

export async function getAdminOpsStatus(): Promise<AdminOpsStatus> {
  const schemaHealth = await inspectSchemaHealth({ forceRefresh: true });
  const databaseUrl = requireEnvValue("DATABASE_URL");
  const adminPassword = requireEnvValue("ADMIN_PASSWORD");
  const nextAuthSecret = requireEnvValue("NEXTAUTH_SECRET");
  const cronSecret = requireEnvValue("CRON_SECRET");
  const syncToken = requireEnvValue("SYNC_API_TOKEN");
  const hasRpc = Boolean(
    requireEnvValue("NEXT_PUBLIC_SOLANA_RPC_URL") ||
      requireEnvValue("NEXT_PUBLIC_SOLANA_RPC") ||
      requireEnvValue("SOLANA_RPC_URL") ||
      requireEnvValue("HELIUS_API_KEY"),
  );
  const externalListingsDbSyncCheck =
    await buildExternalListingsDbSyncCheck(databaseUrl);

  const checks: OpsCheck[] = [
    {
      key: "schema-health",
      label: "Schema health",
      status:
        schemaHealth.severity === "ok"
          ? "pass"
          : schemaHealth.severity === "warning"
            ? "warn"
            : schemaHealth.severity === "blocking" ||
                schemaHealth.severity === "unreachable" ||
                schemaHealth.severity === "unconfigured"
              ? "fail"
              : "unknown",
      detail: schemaHealth.summary,
      remediation: schemaHealth.recoveryHint,
    },
    {
      key: "database-url",
      label: "DATABASE_URL",
      status: databaseUrl ? "pass" : "fail",
      detail: databaseUrl
        ? "Configured for runtime persistence."
        : "Missing; checkout/runtime persistence is disabled.",
      remediation: "Set DATABASE_URL and run npm run db:preflight.",
    },
    parseDatabaseUrlProtocolStatus(databaseUrl),
    {
      key: "admin-password",
      label: "ADMIN_PASSWORD",
      status: adminPassword ? "pass" : "fail",
      detail: adminPassword
        ? "Configured for admin API auth."
        : "Missing; admin write routes are not protected.",
      remediation: "Set a strong ADMIN_PASSWORD secret.",
    },
    {
      key: "nextauth-secret",
      label: "NEXTAUTH_SECRET",
      status: nextAuthSecret ? "pass" : "warn",
      detail: nextAuthSecret
        ? "Configured for session signing."
        : "Missing; session auth reliability may degrade.",
      remediation: "Set NEXTAUTH_SECRET in env for stable session signing.",
    },
    {
      key: "cron-secret",
      label: "CRON_SECRET",
      status: cronSecret ? "pass" : "warn",
      detail: cronSecret
        ? "Configured for cron route auth."
        : "Missing; scheduled routes cannot be safely protected.",
      remediation: "Set CRON_SECRET and align cron callers.",
    },
    {
      key: "sync-api-token",
      label: "SYNC_API_TOKEN",
      status: syncToken ? "pass" : "warn",
      detail: syncToken
        ? "Configured as dedicated sync bearer token."
        : "Not set; /api/sync bearer auth falls back to ADMIN_PASSWORD.",
      remediation: "Set SYNC_API_TOKEN separate from ADMIN_PASSWORD.",
    },
    {
      key: "solana-rpc",
      label: "Solana RPC",
      status: hasRpc ? "pass" : "warn",
      detail: hasRpc
        ? "RPC endpoint configured."
        : "Missing NEXT_PUBLIC_SOLANA_RPC_URL/SOLANA_RPC_URL/HELIUS_API_KEY.",
      remediation:
        "Set NEXT_PUBLIC_SOLANA_RPC_URL (client) and SOLANA_RPC_URL or HELIUS_API_KEY (server).",
    },
    parseSiteUrlStatus(),
    {
      key: "discover-aggregator",
      label: "Discover aggregator",
      status: "warn",
      detail: "Archived — /discover redirects to /trade. External listing sync remains for operator tooling.",
      remediation:
        "Primary purchase lane is /trade. See docs/discover-setup.md (ARCHIVED) and docs/integrations/rwa-trading-platform.md.",
    },
    (() => {
      const seed = getExternalListingSeedStats();
      const hasSeed = seed.activeCount > 0;
      const staleRatio =
        seed.activeCount > 0 ? seed.staleCount / seed.activeCount : 0;

      return {
        key: "external-listings-seed",
        label: "External listings seed",
        status: !hasSeed ? "warn" : staleRatio > 0.5 ? "warn" : "pass",
        detail: hasSeed
          ? `${seed.activeCount} active JSON rows (${seed.staleCount} stale). Newest indexed ${seed.newestIndexedAt ?? "unknown"}.`
          : "data/external-listings.json has no active rows.",
        remediation: "Run npm run sync:discover to refresh Collector Crypt inventory.",
      };
    })(),
    externalListingsDbSyncCheck,
    {
      key: "reserve-wallet-challenge",
      label: "Reserve wallet challenge",
      status: isReserveWalletChallengeRequired() ? "pass" : "warn",
      detail: isReserveWalletChallengeRequired()
        ? "RESERVE_REQUIRE_WALLET_CHALLENGE active (explicit or production default)."
        : "Wallet challenge not required — reserve endpoint accepts unsigned requests.",
      remediation:
        "Set RESERVE_REQUIRE_WALLET_CHALLENGE=true in production after client rollout.",
    },
  ];

  const recentFailures = getRecentOperatorFailures(10);

  return {
    generatedAt: new Date().toISOString(),
    checks,
    schemaSeverity: schemaHealth.severity,
    recentFailures,
    remediationPointers: summarizeChecks(checks),
  };
}
