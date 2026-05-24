/**
 * One-shot repo progress audit via Cursor SDK (local runtime).
 *
 * Default: Agent.prompt audit (requires CURSOR_API_KEY).
 * Optional: --report-only for JSON backlog snapshot without API.
 *
 * Usage:
 *   npm run cursor:investigate
 *   npm run orchestrate:investigate -- --report-only
 *   CURSOR_API_KEY=cursor_... npx tsx scripts/cursor-sdk/investigate-progress.ts
 */

import {
  gitSnapshot,
  openBacklogItems,
  parseBacklogItems,
  readRepoFile,
  summarizeStatusSections,
} from "./_shared";
import {
  exitFromOutcomes,
  printLaneOutcome,
  requireApiKey,
  runLanePrompt,
} from "./shared";

const AUDIT_PROMPT = `You are auditing the SlabVaultFi repo at the local working tree.

Read these sources of truth (do not invent status):
- docs/STATUS.md
- docs/mvp-backlog.md
- VAULT_MARKETPLACE_ROADMAP.md
- docs/integrations/tensor-tradesite-ux-audit.md
- docs/integrations/tensor-repo-vendoring.md
- docs/integrations/onchain-trade-stack.md (if present)
- app/trade/**, components/trade-*.tsx, lib/integrations/**, lib/onchain/**

Deliver a concise markdown report with sections:
1. Shipped — what is live in code today (routes, APIs, wallet flows)
2. In progress — partial implementations with file paths
3. Top 5 blockers — ordered by impact on /trade MVP
4. Recommended parallel lanes — 2–3 independent workstreams for the next sprint

Keep it factual, cite file paths, no hype. Do not commit or write secrets.`;

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    reportOnly: args.includes("--report-only"),
    json: args.includes("--json") || (!args.includes("--pretty") && args.includes("--report-only")),
  };
}

async function buildReportJson() {
  const [statusMarkdown, backlogMarkdown] = await Promise.all([
    readRepoFile("docs/STATUS.md").catch(() => ""),
    readRepoFile("docs/mvp-backlog.md"),
  ]);

  const items = parseBacklogItems(backlogMarkdown);
  const openItems = openBacklogItems(items);
  const git = gitSnapshot();
  const statusSections = statusMarkdown ? summarizeStatusSections(statusMarkdown) : {};

  const byPriority = Object.fromEntries(
    ["P0", "P1", "P2", "P3", "P4"].map((priority) => [
      priority,
      {
        done: items.filter((item) => item.priority === priority && item.status === "DONE")
          .length,
        open: openItems.filter((item) => item.priority === priority).length,
      },
    ]),
  );

  return {
    generatedAt: new Date().toISOString(),
    git,
    status: {
      hasStatusDoc: Boolean(statusMarkdown),
      sections: statusSections,
    },
    backlog: {
      total: items.length,
      open: openItems.length,
      byPriority,
      topOpen: openItems.slice(0, 10).map((item) => ({
        id: item.id,
        priority: item.priority,
        title: item.title,
        status: item.status,
      })),
    },
  };
}

async function main() {
  const { reportOnly, json } = parseArgs();

  if (reportOnly || !process.env.CURSOR_API_KEY?.trim()) {
    const report = await buildReportJson();
    console.log(JSON.stringify(report, null, json ? 0 : 2));
    if (!process.env.CURSOR_API_KEY?.trim() && !reportOnly) {
      console.error(
        "[orchestrate:investigate] CURSOR_API_KEY not set — returned JSON snapshot only. Use --dispatch after adding the key.",
      );
    }
    return;
  }

  const apiKey = requireApiKey();
  console.log("[cursor:investigate] starting local one-shot audit…");

  const outcome = await runLanePrompt("investigate", AUDIT_PROMPT, apiKey);
  printLaneOutcome(outcome);
  exitFromOutcomes([outcome]);
}

main().catch((error) => {
  console.error("[cursor:investigate] unexpected error", error);
  process.exit(1);
});
