/**
 * Pick the next autonomous task from STATUS.md + mvp-backlog.
 *
 * Usage:
 *   npm run orchestrate:next
 *   npm run orchestrate:next -- --lane security
 *   npm run orchestrate:next -- --dispatch   # requires CURSOR_API_KEY
 */

import { Agent, CursorAgentError } from "@cursor/sdk";
import {
  approvalGatesForItem,
  buildTaskPrompt,
  laneForItem,
  openBacklogItems,
  parseBacklogItems,
  readRepoFile,
  summarizeStatusSections,
  type LaneId,
} from "./_shared";

function parseArgs() {
  const args = process.argv.slice(2);
  let lane: LaneId | undefined;

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--lane") {
      lane = args[i + 1] as LaneId;
      i += 1;
    }
  }

  return {
    lane,
    dispatch: args.includes("--dispatch"),
    dryRun: args.includes("--dry-run"),
  };
}

async function main() {
  const { lane, dispatch, dryRun } = parseArgs();
  const [statusMarkdown, backlogMarkdown] = await Promise.all([
    readRepoFile("docs/STATUS.md").catch(() => ""),
    readRepoFile("docs/mvp-backlog.md"),
  ]);

  const openItems = openBacklogItems(parseBacklogItems(backlogMarkdown));
  const candidates = lane
    ? openItems.filter((item) => laneForItem(item) === lane)
    : openItems;

  const next = candidates[0];
  if (!next) {
    const output = {
      generatedAt: new Date().toISOString(),
      task: null,
      message: lane
        ? `No open backlog items in lane "${lane}".`
        : "No open backlog items found.",
    };
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  const prompt = buildTaskPrompt(next);
  const approvalGates = approvalGatesForItem(next);
  const statusSections = statusMarkdown ? summarizeStatusSections(statusMarkdown) : {};

  const payload = {
    generatedAt: new Date().toISOString(),
    task: {
      id: next.id,
      priority: next.priority,
      lane: laneForItem(next),
      status: next.status,
      title: next.title,
      notes: next.notes,
      approvalGates,
      prompt,
      statusContext: statusSections["current focus"] ?? statusSections.overview ?? [],
    },
    orchestration: {
      sentinel: "AGENT_LOOP_TICK",
      intervalMinutes: 30,
      requiresApproval: approvalGates,
    },
  };

  if (dryRun) {
    console.log(`[orchestrate:next] task=${next.id} lane=${laneForItem(next)}`);
    console.log(prompt);
    return;
  }

  if (dispatch) {
    const apiKey = process.env.CURSOR_API_KEY?.trim();
    if (!apiKey) {
      console.error("CURSOR_API_KEY is required for --dispatch");
      process.exit(1);
    }

    try {
      const result = await Agent.prompt(prompt, {
        apiKey,
        model: { id: "composer-2" },
        local: { cwd: process.cwd(), settingSources: [] },
      });

      Object.assign(payload, {
        agent: {
          runStatus: result.status,
          result: result.result,
        },
      });
    } catch (error) {
      if (error instanceof CursorAgentError) {
        console.error(`Agent startup failed: ${error.message}`);
        process.exit(1);
      }
      throw error;
    }
  }

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
