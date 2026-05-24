import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export type BacklogItem = {
  id: string;
  status: "DONE" | "TODO" | "IN PROGRESS" | "BLOCKED";
  title: string;
  notes: string;
  priority: string;
  category: string;
};

export type LaneId =
  | "security"
  | "ops"
  | "marketplace"
  | "trade"
  | "discover"
  | "data"
  | "testing"
  | "product"
  | "integrations"
  | "wallet"
  | "growth";

export const LANE_BY_CATEGORY: Record<string, LaneId> = {
  SEC: "security",
  OPS: "ops",
  MKT: "marketplace",
  INT: "integrations",
  DAT: "data",
  TST: "testing",
  PRD: "product",
  UX: "product",
  WAL: "wallet",
  GRW: "growth",
};

export const PRIORITY_ORDER = ["P0", "P1", "P2", "P3", "P4"] as const;

const BACKLOG_ROW =
  /^\|\s*(P\d+-[A-Z0-9-]+)\s*\|\s*(DONE|TODO|IN PROGRESS|BLOCKED)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|/;

export async function readRepoFile(relativePath: string): Promise<string> {
  return readFile(resolve(process.cwd(), relativePath), "utf8");
}

function parseBacklogId(id: string): { priority: string; category: string } | null {
  const match = id.match(/^(P\d+)-([A-Z]+)/);
  if (!match) return null;
  return { priority: match[1], category: match[2] };
}

/** Tensor Phase 1 before Phase 2/3 within trade lane. */
export function tensorPhaseRank(id: string, title: string): number {
  const phaseMatch = title.match(/Phase\s*(\d)/i);
  if (phaseMatch) return Number.parseInt(phaseMatch[1], 10);
  if (/^P2-INT-OC/.test(id)) return 2;
  return 1;
}

export function parseBacklogItems(markdown: string): BacklogItem[] {
  const byId = new Map<string, BacklogItem>();

  for (const line of markdown.split("\n")) {
    const match = line.match(BACKLOG_ROW);
    if (!match) continue;

    const [, id, status, title, notes] = match;
    const parsed = parseBacklogId(id);
    if (!parsed) continue;

    byId.set(id, {
      id,
      status: status as BacklogItem["status"],
      title: title.trim(),
      notes: notes.trim(),
      priority: parsed.priority,
      category: parsed.category,
    });
  }

  return [...byId.values()];
}

export function laneForItem(item: BacklogItem): LaneId {
  if (item.id.includes("-INT-T") || item.id.includes("-INT-OC")) {
    return "trade";
  }
  if (item.id.includes("-INT-D") || item.id.includes("-INT-CC") || item.id.includes("-INT-PG")) {
    return "discover";
  }

  const categoryLane = LANE_BY_CATEGORY[item.category];
  if (categoryLane) return categoryLane;

  if (item.title.toLowerCase().includes("tensor")) {
    return "trade";
  }
  if (item.title.toLowerCase().includes("discover")) {
    return "discover";
  }

  return "integrations";
}

export function compareBacklogItems(a: BacklogItem, b: BacklogItem): number {
  const priorityDelta =
    PRIORITY_ORDER.indexOf(a.priority as (typeof PRIORITY_ORDER)[number]) -
    PRIORITY_ORDER.indexOf(b.priority as (typeof PRIORITY_ORDER)[number]);
  if (priorityDelta !== 0) return priorityDelta;

  const laneA = laneForItem(a);
  const laneB = laneForItem(b);
  if (laneA === "trade" && laneB === "trade") {
    const phaseDelta = tensorPhaseRank(a.id, a.title) - tensorPhaseRank(b.id, b.title);
    if (phaseDelta !== 0) return phaseDelta;
    const aTensorUi = a.id.includes("-INT-T");
    const bTensorUi = b.id.includes("-INT-T");
    if (aTensorUi !== bTensorUi) return aTensorUi ? -1 : 1;
  }

  return a.id.localeCompare(b.id);
}

export function openBacklogItems(items: BacklogItem[]): BacklogItem[] {
  return items
    .filter((item) => item.status === "TODO" || item.status === "IN PROGRESS")
    .sort(compareBacklogItems);
}

export function summarizeStatusSections(markdown: string): Record<string, string[]> {
  const sections: Record<string, string[]> = {};
  let current = "overview";

  for (const line of markdown.split("\n")) {
    if (line.startsWith("## ")) {
      current = line.replace(/^##\s+/, "").trim().toLowerCase();
      sections[current] = sections[current] ?? [];
      continue;
    }

    const bullet = line.match(/^-\s+\*\*(.+?)\*\*:\s*(.+)$/);
    if (bullet) {
      sections[current] = sections[current] ?? [];
      sections[current].push(`${bullet[1]}: ${bullet[2]}`);
    }
  }

  return sections;
}

export function gitSnapshot(): {
  branch: string | null;
  dirty: boolean;
  changedFiles: string[];
} {
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    const status = execSync("git status --porcelain", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    const changedFiles = status
      ? status
          .split("\n")
          .map((line) => line.slice(3).trim())
          .filter(Boolean)
      : [];

    return { branch, dirty: changedFiles.length > 0, changedFiles };
  } catch {
    return { branch: null, dirty: false, changedFiles: [] };
  }
}

export function approvalGatesForItem(item: BacklogItem): string[] {
  const gates = new Set<string>(["commit"]);
  const haystack = `${item.id} ${item.title} ${item.notes}`.toLowerCase();

  if (
    /secret|password|api[_-]?key|token|credential|\.env|wallet.?secret|server_wallet/.test(
      haystack,
    )
  ) {
    gates.add("secrets");
  }

  if (
    /mainnet|production deploy|program deploy|anchor deploy|migrate deploy|ops:env:production/.test(
      haystack,
    )
  ) {
    gates.add("mainnet");
  }

  return [...gates];
}

export function buildTaskPrompt(item: BacklogItem): string {
  const allowCommit = process.env.ORCHESTRATE_ALLOW_COMMIT === "1";
  return [
    `Repo: ${process.cwd()}.`,
    `Implement exactly ONE backlog item: ${item.id} (${item.priority}).`,
    `Title: ${item.title}.`,
    item.notes ? `Notes: ${item.notes}.` : null,
    "Read docs/STATUS.md and docs/mvp-backlog.md first.",
    "Mark item IN PROGRESS at start, DONE when verified in both files.",
    "Run npm run qa:ci before finishing.",
    allowCommit
      ? "Commit is allowed when ORCHESTRATE_ALLOW_COMMIT=1."
      : "Do NOT commit unless ORCHESTRATE_ALLOW_COMMIT=1.",
    "Do NOT add secrets to git.",
    "Stop before mainnet deploys, production feature flags, or production env changes.",
  ]
    .filter(Boolean)
    .join(" ");
}
