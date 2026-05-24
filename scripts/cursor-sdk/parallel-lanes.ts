/**
 * Parallel investigation + work lanes via Cursor SDK (local runtime).
 *
 * Spawns independent Agent.prompt calls:
 *   (a) Tensor UI gaps vs UX audit doc
 *   (b) On-chain integration gaps vs vendoring / trade-stack docs
 *   (c) qa:ci — diagnose and fix lint / test / build failures
 *
 * Usage:
 *   npm run cursor:parallel
 *   npm run cursor:parallel -- --lanes=tensor-ui,onchain
 *   CURSOR_API_KEY=cursor_... npx tsx scripts/cursor-sdk/parallel-lanes.ts
 */

import {
  exitFromOutcomes,
  printLaneOutcome,
  requireApiKey,
  runLanePrompt,
  type LaneOutcome,
} from "./shared";

type LaneId = "tensor-ui" | "onchain" | "qa-ci";

const LANES: Record<LaneId, { label: string; prompt: string }> = {
  "tensor-ui": {
    label: "Tensor UI vs audit doc",
    prompt: `Lane: Tensor UI gap analysis (read-only investigation first, then smallest shippable fixes if obvious).

Compare the current /trade experience against docs/integrations/tensor-tradesite-ux-audit.md:
- app/trade/**, components/trade-*.tsx, lib/trade-listings.ts, lib/layout.ts
- Missing routes (e.g. /trade/slab/[certOrMint]), grids, filters, activity column, buy/list modals

Output:
1. P0 gaps still open (with audit section refs)
2. Files to touch for the next increment
3. If a fix is trivial and safe (< ~30 lines), implement it; otherwise stop at the plan

Do not commit. Do not write secrets.`,
  },
  onchain: {
    label: "On-chain integration gaps",
    prompt: `Lane: On-chain integration gap analysis.

Compare implementation vs docs:
- docs/integrations/onchain-trade-stack.md
- docs/integrations/tensor-repo-vendoring.md (week 1–4 order)
- lib/onchain/**, lib/integrations/tensor.ts, .env.example Tensor/on-chain vars

Output:
1. What is wired (read paths, write paths, env flags)
2. Week 1–4 gaps with blockers (API keys, program IDs, wallet flows)
3. Smallest next step for the on-chain lane — no large refactors

Do not commit. Do not write secrets.`,
  },
  "qa-ci": {
    label: "qa:ci fix",
    prompt: `Lane: Make npm run qa:ci pass.

Steps:
1. Run \`npm run qa:ci\` (lint && test && build) from repo root
2. Capture failures; fix root causes with minimal diffs
3. Re-run until green or report blockers you cannot fix without secrets/external services

Do not commit. Do not add real API keys. Prefer targeted fixes over broad refactors.`,
  },
};

const ALL_LANE_IDS = Object.keys(LANES) as LaneId[];

function parseLaneFilter(): LaneId[] {
  const args = process.argv.slice(2);
  const lanesArg = args.find((a) => a.startsWith("--lanes="))?.slice("--lanes=".length);
  const lanesFlagIdx = args.indexOf("--lanes");
  const lanesValue =
    lanesArg ??
    (lanesFlagIdx >= 0 ? args[lanesFlagIdx + 1] : undefined);

  if (!lanesValue) {
    return ALL_LANE_IDS;
  }

  const requested = lanesValue.split(",").map((s) => s.trim()) as LaneId[];
  const invalid = requested.filter((id) => !ALL_LANE_IDS.includes(id));
  if (invalid.length) {
    console.error(
      `[cursor:parallel] Unknown lane(s): ${invalid.join(", ")}. Valid: ${ALL_LANE_IDS.join(", ")}`,
    );
    process.exit(1);
  }

  return requested;
}

async function main() {
  const apiKey = requireApiKey();
  const laneIds = parseLaneFilter();

  console.log(
    `[cursor:parallel] spawning ${laneIds.length} lane(s) in parallel: ${laneIds.join(", ")}`,
  );

  const outcomes: LaneOutcome[] = await Promise.all(
    laneIds.map((id) => {
      const lane = LANES[id];
      console.log(`[cursor:parallel] → ${id}: ${lane.label}`);
      return runLanePrompt(id, lane.prompt, apiKey);
    }),
  );

  console.log("\n[cursor:parallel] results\n" + "─".repeat(48));
  for (const outcome of outcomes) {
    printLaneOutcome(outcome);
    console.log("─".repeat(48));
  }

  exitFromOutcomes(outcomes);
}

main().catch((error) => {
  console.error("[cursor:parallel] unexpected error", error);
  process.exit(1);
});
