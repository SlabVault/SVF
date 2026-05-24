import { rename, writeFile } from "node:fs/promises";

/** Write file atomically so parallel readers never see partial JSON. */
export async function atomicWriteFile(
  filePath: string,
  content: string,
): Promise<void> {
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tempPath, content, "utf-8");
  await rename(tempPath, filePath);
}
