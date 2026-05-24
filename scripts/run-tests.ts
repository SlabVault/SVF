import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dirs = ["tests", "__tests__"];

function walk(relDir: string, acc: string[] = []): string[] {
  const abs = join(root, relDir);
  for (const ent of readdirSync(abs, { withFileTypes: true })) {
    const child = `${relDir}/${ent.name}`.replace(/\\/g, "/");
    if (ent.isDirectory()) walk(child, acc);
    else if (ent.name.endsWith(".test.ts")) acc.push(child);
  }
  return acc;
}

const pattern = process.argv
  .find((arg) => arg.startsWith("--testPathPattern="))
  ?.slice("--testPathPattern=".length);

let files = dirs.flatMap((dir) => walk(dir));
if (pattern) {
  files = files.filter((file) => file.includes(pattern));
}

const result = spawnSync(
  "npx",
  ["tsx", "--import", "./tests/test-env.ts", "--test", ...files],
  { cwd: root, stdio: "inherit", shell: true },
);

process.exit(result.status ?? 1);
