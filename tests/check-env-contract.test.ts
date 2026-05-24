import assert from "node:assert/strict";
import test from "node:test";
import {
  runCheckEnvContract,
} from "../scripts/check-env-contract.ts";

const P0_SEC_09 = "P0-SEC-09";

const PRODUCTION_ENV: NodeJS.ProcessEnv = {
  NEXT_PUBLIC_SITE_URL: "https://slabvault.fi",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/svf",
  NEXTAUTH_SECRET: "test-nextauth-secret-value",
  ADMIN_PASSWORD: "test-admin-password-value",
  CRON_SECRET: "test-cron-secret-value",
  NEXT_PUBLIC_SOLANA_RPC_URL: "https://api.mainnet-beta.solana.com",
};

function p0Sec09Findings(findings: Array<{ level: string; message: string }>) {
  return findings.filter((finding) => finding.message.includes(P0_SEC_09));
}

test("production mode with unset TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE does not emit P0-SEC-09", () => {
  const prior = process.env.TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE;
  delete process.env.TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE;
  Object.assign(process.env, PRODUCTION_ENV);

  try {
    const { findings } = runCheckEnvContract(["--production"]);
    assert.equal(p0Sec09Findings(findings).length, 0);
  } finally {
    if (prior === undefined) {
      delete process.env.TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE;
    } else {
      process.env.TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE = prior;
    }
  }
});

test("production mode with explicit false emits P0-SEC-09 ERROR", () => {
  const prior = process.env.TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE;
  Object.assign(process.env, PRODUCTION_ENV, {
    TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE: "false",
  });

  try {
    const { findings } = runCheckEnvContract(["--production"]);
    const messages = p0Sec09Findings(findings);
    assert.equal(messages.length, 1);
    assert.equal(messages[0]?.level, "ERROR");
    assert.match(messages[0]?.message ?? "", /explicitly false/);
  } finally {
    if (prior === undefined) {
      delete process.env.TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE;
    } else {
      process.env.TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE = prior;
    }
  }
});

test("dev mode with unset TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE emits P0-SEC-09 WARN", () => {
  const prior = process.env.TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE;
  delete process.env.TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE;

  try {
    const { findings } = runCheckEnvContract([]);
    const messages = p0Sec09Findings(findings);
    assert.equal(messages.length, 1);
    assert.equal(messages[0]?.level, "WARN");
    assert.match(messages[0]?.message ?? "", /is not set/);
  } finally {
    if (prior === undefined) {
      delete process.env.TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE;
    } else {
      process.env.TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE = prior;
    }
  }
});
