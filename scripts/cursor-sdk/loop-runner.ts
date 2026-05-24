/**
 * Recurring local orchestration loop (loop skill pattern).
 *
 * Usage:
 *   npm run orchestrate:loop
 *   npm run orchestrate:loop -- --interval 4h --lane trade --dispatch
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildTaskPrompt,
  laneForItem,
  openBacklogItems,
  parseBacklogItems,
  readRepoFile,
  type LaneId,
} from "./_shared";
import { REPO_ROOT, requireApiKey, runLanePrompt, printLaneOutcome } from "./shared";

const STATE_DIR = resolve(REPO_ROOT, ".cursor/orchestration");
const STATE_FILE = resolve(STATE_DIR, "last-run.json");

type LastRunState = {
  lastTaskId: string | null;
  lastRunAt: string;
  lastStatus: string;
};

function parseInterval(raw: string | undefined): number {
  if (!raw) return 2 * 3_600_000;
  const match = raw.trim().match(/^(\d+(?:\.\d+)?)(s|m|h|d)?$/i);
  if (!match) throw new Error(`invalid interval: ${raw}`);
  const value = Number.parseFloat(match[1]);
  const unit = (match[2] ?? "h").toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * multipliers[unit];
}

function parseArgs() {
  const args = process.argv.slice(2);
  const getVal = (flag: string) => {
    const eq = args.find((a) => a.startsWith(`${flag}=`));
    if (eq) return eq.split("=")[1];
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };

  return {
    dryRun: args.includes("--dry-run"),
    dispatch: args.includes("--dispatch"),
    once: args.includes("--once"),
    lane: getVal("--lane") as LaneId | undefined,
    intervalMs: parseInterval(getVal("--interval")),
  };
}

function readState(): LastRunState | null {
  if (!existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8")) as LastRunState;
  } catch {
    return null;
  }
}

function writeState(state: LastRunState) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function tick(options: ReturnType<typeof parseArgs>) {
  const backlogMarkdown = await readRepoFile("docs/mvp-backlog.md");
  const openItems = openBacklogItems(parseBacklogItems(backlogMarkdown));
  const lastId = readState()?.lastTaskId;
  const candidates = openItems.filter((item) => {
    if (lastId && item.id === lastId) return false;
    if (options.lane && laneForItem(item) !== options.lane) return false;
    return item.status === "TODO";
  });

  const next = candidates[0];
  if (!next) {
    console.log("[orchestrate:loop] idle — no TODO items");
    return 0;
  }

  const prompt = buildTaskPrompt(next);
  console.log(`[orchestrate:loop] task=${next.id} lane=${laneForItem(next)}`);

  if (options.dryRun) {
    console.log(prompt);
    writeState({
      lastTaskId: next.id,
      lastRunAt: new Date().toISOString(),
      lastStatus: "dry-run",
    });
    return 0;
  }

  if (!options.dispatch) {
    console.log(JSON.stringify({ task: next.id, prompt }, null, 2));
    return 0;
  }

  const apiKey = requireApiKey();
  const outcome = await runLanePrompt(next.id, prompt, apiKey);
  printLaneOutcome(outcome);
  writeState({
    lastTaskId: next.id,
    lastRunAt: new Date().toISOString(),
    lastStatus: outcome.ok ? outcome.status : outcome.kind,
  });
  return outcome.ok ? 0 : outcome.kind === "startup" ? 1 : 2;
}

async function main() {
  const options = parseArgs();

  if (options.once) {
    process.exit(await tick(options));
  }

  console.log(
    `[orchestrate:loop] armed interval=${options.intervalMs}ms lane=${options.lane ?? "any"}`,
  );

  for (;;) {
    const code = await tick(options);
    if (code === 1) process.exit(1);
    console.log(`[orchestrate:loop] sleep ${options.intervalMs}ms`);
    await sleep(options.intervalMs);
  }
}

main().catch((err) => {
  console.error("[orchestrate:loop] fatal:", err);
  process.exit(1);
});
