/**
 * Shared helpers for Cursor SDK orchestrator scripts.
 * Traps avoided: explicit local cwd, CursorAgentError vs result.status, no leaked agents.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Agent, CursorAgentError, type SettingSource } from "@cursor/sdk";

const scriptDir = dirname(fileURLToPath(import.meta.url));

/** Repo root — explicit cwd for local agents (do not rely on shell cwd). */
export const REPO_ROOT = resolve(scriptDir, "../..");

export function requireApiKey(): string {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      "[cursor-sdk] Missing CURSOR_API_KEY. Add it to .env or export it (see .env.example).",
    );
    process.exit(1);
  }
  return apiKey;
}

/** Local runtime options — always pass explicitly even though local is the default. */
export function localAgentOptions() {
  return {
    local: {
      cwd: REPO_ROOT,
      settingSources: [] as SettingSource[],
    },
  };
}

export type LaneOutcome =
  | { ok: true; lane: string; status: string; result: string }
  | {
      ok: false;
      lane: string;
      kind: "startup" | "run";
      message: string;
      retryable?: boolean;
    };

/**
 * One-shot Agent.prompt with SDK trap handling.
 * Agent.prompt disposes the agent automatically — no asyncDispose needed here.
 */
export async function runLanePrompt(
  lane: string,
  prompt: string,
  apiKey: string,
): Promise<LaneOutcome> {
  try {
    const result = await Agent.prompt(prompt, {
      apiKey,
      model: { id: "composer-2" },
      ...localAgentOptions(),
    });

    if (result.status === "error") {
      return {
        ok: false,
        lane,
        kind: "run",
        message: `agent run failed (run id=${result.id ?? "unknown"})`,
      };
    }

    return {
      ok: true,
      lane,
      status: result.status,
      result: result.result ?? "",
    };
  } catch (err) {
    if (err instanceof CursorAgentError) {
      return {
        ok: false,
        lane,
        kind: "startup",
        message: err.message,
        retryable: err.isRetryable,
      };
    }
    throw err;
  }
}

export function printLaneOutcome(outcome: LaneOutcome): void {
  const prefix = `[${outcome.lane}]`;

  if (outcome.ok) {
    console.log(`${prefix} status=${outcome.status}`);
    console.log(outcome.result.trim() || "(empty result)");
    return;
  }

  if (outcome.kind === "startup") {
    console.error(
      `${prefix} startup failed: ${outcome.message} (retryable=${outcome.retryable ?? false})`,
    );
    return;
  }

  console.error(`${prefix} run failed: ${outcome.message}`);
}

/** Exit 1 = startup/CursorAgentError, 2 = run error, 0 = all ok. */
export function exitFromOutcomes(outcomes: LaneOutcome[]): never {
  const startupFailures = outcomes.filter((o) => !o.ok && o.kind === "startup").length;
  const runFailures = outcomes.filter((o) => !o.ok && o.kind === "run").length;

  if (startupFailures > 0) {
    console.error(`\n[cursor-sdk] ${startupFailures} lane(s) failed to start.`);
    process.exit(1);
  }

  if (runFailures > 0) {
    console.error(`\n[cursor-sdk] ${runFailures} lane(s) errored mid-run.`);
    process.exit(2);
  }

  console.log("\n[cursor-sdk] all lanes finished.");
  process.exit(0);
}
