/**
 * Quarterly secret rotation reminders (no secret values logged).
 *
 * Usage:
 *   npm run ops:rotation:check
 *
 * Optional ISO-8601 timestamps in env (set in Vercel after each rotation):
 *   OPS_NEXTAUTH_SECRET_ROTATED_AT
 *   OPS_ADMIN_PASSWORD_ROTATED_AT
 *   OPS_CRON_SECRET_ROTATED_AT
 *   OPS_SYNC_API_TOKEN_ROTATED_AT
 */

const QUARTERLY_DAYS = 90;

type RotationItem = {
  label: string;
  envKey: string;
  optional?: boolean;
};

const ITEMS: RotationItem[] = [
  { label: "NEXTAUTH_SECRET", envKey: "OPS_NEXTAUTH_SECRET_ROTATED_AT" },
  { label: "ADMIN_PASSWORD", envKey: "OPS_ADMIN_PASSWORD_ROTATED_AT" },
  { label: "CRON_SECRET", envKey: "OPS_CRON_SECRET_ROTATED_AT" },
  {
    label: "SYNC_API_TOKEN",
    envKey: "OPS_SYNC_API_TOKEN_ROTATED_AT",
    optional: true,
  },
];

function readTimestamp(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function daysSince(iso: string): number | null {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return null;
  return Math.floor((Date.now() - parsed) / (24 * 60 * 60 * 1000));
}

let dueCount = 0;
let warnCount = 0;

console.log(`[ops:rotation] quarterly window=${QUARTERLY_DAYS} days`);

for (const item of ITEMS) {
  const stamp = readTimestamp(item.envKey);
  if (!stamp) {
    if (item.optional && !process.env.SYNC_API_TOKEN?.trim()) {
      console.log(`[INFO] ${item.label}: ${item.envKey} not set (SYNC_API_TOKEN unset — skip)`);
      continue;
    }
    console.log(
      `[WARN] ${item.label}: ${item.envKey} missing — set after rotation (see docs/runbooks/operations-hardening.md §6)`,
    );
    warnCount += 1;
    continue;
  }

  const ageDays = daysSince(stamp);
  if (ageDays === null) {
    console.log(`[WARN] ${item.label}: ${item.envKey} is not a valid ISO-8601 date`);
    warnCount += 1;
    continue;
  }

  if (ageDays >= QUARTERLY_DAYS) {
    console.log(
      `[DUE] ${item.label}: last recorded ${ageDays} days ago (${item.envKey}=${stamp.slice(0, 10)})`,
    );
    dueCount += 1;
  } else {
    const remaining = QUARTERLY_DAYS - ageDays;
    console.log(
      `[OK] ${item.label}: ${ageDays} days since rotation (${remaining} days until due)`,
    );
  }
}

if (dueCount) {
  console.log(`\n[ops:rotation] ${dueCount} secret(s) due for quarterly rotation.`);
  process.exit(1);
}

if (warnCount) {
  console.log(`\n[ops:rotation] passed with ${warnCount} tracking warning(s).`);
} else {
  console.log("\n[ops:rotation] all tracked secrets within quarterly window.");
}
