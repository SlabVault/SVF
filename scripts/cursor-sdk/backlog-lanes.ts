/**
 * Group open backlog items into parallel orchestration lanes (no API key).
 *
 * Usage:
 *   npm run orchestrate:lanes
 *   npm run orchestrate:lanes -- --max 5
 */

import {
  laneForItem,
  openBacklogItems,
  parseBacklogItems,
  readRepoFile,
  type BacklogItem,
  type LaneId,
} from "./_shared";

function parseArgs() {
  const args = process.argv.slice(2);
  let maxPerLane = 5;

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--max") {
      maxPerLane = Number.parseInt(args[i + 1] ?? "5", 10);
      i += 1;
    }
  }

  return { maxPerLane: Number.isFinite(maxPerLane) ? maxPerLane : 5 };
}

function laneSummary(items: BacklogItem[]) {
  const priorities = items.map((item) => item.priority);
  const highest =
    priorities.sort((a, b) => a.localeCompare(b)).find(Boolean) ?? "P4";

  return {
    count: items.length,
    highestPriority: highest,
    items: items.slice(0, 5).map((item) => ({
      id: item.id,
      priority: item.priority,
      title: item.title,
      status: item.status,
    })),
  };
}

async function main() {
  const { maxPerLane } = parseArgs();
  const backlogMarkdown = await readRepoFile("docs/mvp-backlog.md");
  const openItems = openBacklogItems(parseBacklogItems(backlogMarkdown));

  const lanes = new Map<LaneId, BacklogItem[]>();
  for (const item of openItems) {
    const lane = laneForItem(item);
    const bucket = lanes.get(lane) ?? [];
    bucket.push(item);
    lanes.set(lane, bucket);
  }

  const parallelizable = [...lanes.entries()]
    .filter(([, items]) => items.length > 0)
    .map(([lane, items]) => ({
      lane,
      ...laneSummary(items.slice(0, maxPerLane)),
      parallelSafe: lane !== "ops" && lane !== "security",
    }))
    .sort((a, b) => a.highestPriority.localeCompare(b.highestPriority));

  const output = {
    generatedAt: new Date().toISOString(),
    openItems: openItems.length,
    laneCount: parallelizable.length,
    recommendation:
      parallelizable.length > 1
        ? "Run one lane per agent; avoid overlapping ops/security without coordination."
        : "Single-lane focus recommended.",
    lanes: parallelizable,
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
