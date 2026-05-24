import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const nextDir = path.join(root, ".next");

/** Paths that corrupt most often when dev/build race on Windows. */
const STALE_LOCK_PATHS = [
  path.join(nextDir, "lock"),
  path.join(nextDir, "dev", "lock"),
] as const;

const WEBPACK_CACHE_PATHS = [
  path.join(nextDir, "dev", "cache", "webpack"),
  path.join(nextDir, "cache", "webpack"),
] as const;

function warnRunningNodeProcesses(): void {
  if (process.env.SVF_SKIP_NODE_WARN === "1") return;

  try {
    if (process.platform === "win32") {
      const out = execSync('tasklist /FI "IMAGENAME eq node.exe" /NH', {
        encoding: "utf8",
        timeout: 3000,
      });
      const count = out
        .trim()
        .split(/\r?\n/)
        .filter((line) => line.includes("node.exe")).length;
      if (count > 0) {
        console.warn(`Warning: ${count} node.exe process(es) still running.`);
        console.warn(
          "Stop dev server and parallel npm run build before cleaning .next.",
        );
        console.warn(
          "Concurrent dev + build corrupts .next/dev/routes-manifest.json and causes 500s.",
        );
      }
      return;
    }

    const out = execSync("pgrep -fc node || true", {
      encoding: "utf8",
      timeout: 3000,
    }).trim();
    const count = Number.parseInt(out, 10);
    if (Number.isFinite(count) && count > 0) {
      console.warn(`Warning: ${count} node process(es) still running. Stop dev/build first.`);
    }
  } catch {
    console.warn(
      "Could not inspect running node processes — stop dev/build manually if .next keeps corrupting.",
    );
  }
}

function sleepSync(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // busy-wait for short Windows file-lock retries
  }
}

function rmWithRetry(target: string, attempts = 5): void {
  if (!fs.existsSync(target)) return;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      fs.rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      const retryable = code === "EBUSY" || code === "EPERM" || code === "ENOTEMPTY";
      if (!retryable || attempt === attempts) throw error;
      sleepSync(150 * attempt);
    }
  }
}

function removeStaleLocks(): void {
  for (const lockPath of STALE_LOCK_PATHS) {
    if (!fs.existsSync(lockPath)) continue;
    rmWithRetry(lockPath);
    console.log(`Removed stale lock: ${path.relative(root, lockPath)}`);
  }
}

function removeWebpackCaches(): void {
  for (const cachePath of WEBPACK_CACHE_PATHS) {
    if (!fs.existsSync(cachePath)) continue;
    rmWithRetry(cachePath);
    console.log(`Removed webpack cache: ${path.relative(root, cachePath)}`);
  }
}

warnRunningNodeProcesses();
removeStaleLocks();
removeWebpackCaches();

if (fs.existsSync(nextDir)) {
  rmWithRetry(nextDir);
  console.log("Removed .next cache.");
} else {
  console.log(".next not present — nothing to clean.");
}

console.log("Run: npm run dev:clean");
