import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSyncOperatorHints,
  evaluateSyncSourceStatuses,
} from "../lib/data-sync";

test("evaluateSyncSourceStatuses marks stale and healthy sources", () => {
  const statuses = evaluateSyncSourceStatuses(
    {
      "slabs:collector-crypt": {
        lastAttemptAt: "2026-05-20T11:30:00.000Z",
        lastSuccessAt: "2026-05-20T11:30:00.000Z",
        lastStatus: "success",
        detail: "Fetched 32 slabs.",
      },
      "wallet:treasury": {
        lastAttemptAt: "2026-05-20T12:00:00.000Z",
        lastSuccessAt: "2026-05-20T08:00:00.000Z",
        lastStatus: "failure",
        detail: "Failed to fetch wallet balance.",
      },
    },
    "2026-05-20T12:30:00.000Z",
    120,
  );

  const slabsCollectorCrypt = statuses.find(
    (status) => status.key === "slabs:collector-crypt",
  );
  const walletTreasury = statuses.find((status) => status.key === "wallet:treasury");

  assert.ok(slabsCollectorCrypt);
  assert.equal(slabsCollectorCrypt.status, "success");
  assert.equal(slabsCollectorCrypt.isStale, false);
  assert.equal(slabsCollectorCrypt.ageMinutes, 60);

  assert.ok(walletTreasury);
  assert.equal(walletTreasury.status, "failure");
  assert.equal(walletTreasury.isStale, true);
  assert.equal(walletTreasury.ageMinutes, 270);
});

test("buildSyncOperatorHints describes cached fallback and never-synced sources", () => {
  const statuses = evaluateSyncSourceStatuses(
    {
      "pulls:collector-crypt-treasury": {
        lastAttemptAt: "2026-05-20T12:00:00.000Z",
        lastSuccessAt: "2026-05-20T09:00:00.000Z",
        lastStatus: "failure",
        detail: "Source returned no pulls.",
      },
      "wallet:deployer": {
        lastAttemptAt: "2026-05-20T12:00:00.000Z",
        lastSuccessAt: null,
        lastStatus: "failure",
        detail: "No sync attempt recorded yet.",
      },
    },
    "2026-05-20T12:30:00.000Z",
    120,
  );
  const hints = buildSyncOperatorHints(statuses, 120);

  assert.equal(
    hints.some((hint) => hint.includes("serving cached data")),
    true,
  );
  assert.equal(
    hints.some((hint) => hint.includes("never completed a successful sync")),
    true,
  );
  assert.equal(
    hints.some((hint) => hint.includes("data age exceeds 120m")),
    true,
  );
});

test("evaluateSyncSourceStatuses registers unknown diagnostic keys", () => {
  const statuses = evaluateSyncSourceStatuses(
    {
      "slabs:custom-source": {
        lastAttemptAt: "2026-05-20T12:00:00.000Z",
        lastSuccessAt: "2026-05-20T12:00:00.000Z",
        lastStatus: "success",
        detail: "Fetched 3 slabs.",
      },
    },
    "2026-05-20T12:05:00.000Z",
    120,
  );

  const custom = statuses.find((status) => status.key === "slabs:custom-source");
  assert.ok(custom);
  assert.equal(custom.category, "slabs");
  assert.equal(custom.source, "custom-source");
  assert.equal(custom.isStale, false);
});

test("evaluateSyncSourceStatuses marks never-synced sources as stale", () => {
  const statuses = evaluateSyncSourceStatuses(
    {
      "wallet:deployer": {
        lastAttemptAt: "2026-05-20T12:00:00.000Z",
        lastSuccessAt: null,
        lastStatus: "failure",
        detail: "Failed to fetch wallet balance.",
      },
    },
    "2026-05-20T12:30:00.000Z",
    120,
  );

  const deployer = statuses.find((status) => status.key === "wallet:deployer");
  assert.ok(deployer);
  assert.equal(deployer.status, "failure");
  assert.equal(deployer.isStale, true);
  assert.equal(deployer.ageMinutes, null);
});

test("buildSyncOperatorHints reports healthy state when all sources fresh", () => {
  const hints = buildSyncOperatorHints(
    [
      {
        key: "slabs:collector-crypt",
        source: "collector-crypt",
        category: "slabs",
        label: "Slabs via Collector Crypt",
        status: "success",
        lastAttemptAt: "2026-05-20T12:00:00.000Z",
        lastSuccessAt: "2026-05-20T12:00:00.000Z",
        ageMinutes: 5,
        isStale: false,
        detail: "Fetched 10 slabs.",
      },
    ],
    120,
  );

  assert.deepEqual(hints, ["All attempted sync sources report recent successful attempts."]);
});
