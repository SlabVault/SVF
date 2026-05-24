#!/usr/bin/env node
/**
 * Opt-in stop hook: suggest next orchestration task when agent finishes.
 * Enable by creating .cursor/orchestrate-enabled in the repo root.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const ENABLE_FLAG = resolve(ROOT, ".cursor/orchestrate-enabled");

type StopInput = {
  status?: string;
  loop_count?: number;
};

async function main() {
  const raw = await new Promise<string>((resolvePromise, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolvePromise(data));
    process.stdin.on("error", reject);
  });

  if (!existsSync(ENABLE_FLAG)) {
    process.stdout.write("{}\n");
    return;
  }

  let input: StopInput = {};
  try {
    input = JSON.parse(raw || "{}") as StopInput;
  } catch {
    process.stdout.write("{}\n");
    return;
  }

  if ((input.loop_count ?? 0) > 2) {
    process.stdout.write("{}\n");
    return;
  }

  const pickScript = resolve(ROOT, "scripts/cursor-sdk/autonomous-loop.ts");
  const result = spawnSync(
    "npx",
    ["tsx", pickScript, "--dry-run", "--lane", "trade"],
    {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
  });

  if (result.status !== 0 || !result.stdout) {
    process.stdout.write("{}\n");
    return;
  }

  const idMatch = result.stdout.match(/task=(P\d+-[A-Z0-9-]+)/);
  const nextId = idMatch?.[1];
  if (!nextId) {
    process.stdout.write("{}\n");
    return;
  }

  process.stdout.write(
    `${JSON.stringify({
      followup_message: `Orchestration: next backlog item is ${nextId}. Run \`npm run orchestrate:dry-run -- --lane tensor\` or continue if this session should implement it.`,
    })}\n`,
  );
}

main().catch(() => {
  process.stdout.write("{}\n");
});
