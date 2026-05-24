/** Parse boolean env flags with optional dev default when unset. */
export function parseEnvFlag(
  value: string | undefined,
  defaultWhenUnset: boolean,
): boolean {
  const flag = value?.trim().toLowerCase();
  if (flag === "true" || flag === "1") return true;
  if (flag === "false" || flag === "0") return false;
  return defaultWhenUnset;
}
