type EnvUpdates = Record<string, string | undefined>;

/** Origin trusted by CSRF checks in local dev and guardrail tests. */
export const TRUSTED_LOCAL_ORIGIN = "http://localhost:3000";

export function withTrustedOrigin(headers?: HeadersInit): Headers {
  const merged = new Headers(headers);
  if (!merged.has("origin")) {
    merged.set("origin", TRUSTED_LOCAL_ORIGIN);
  }
  return merged;
}

/** Build a same-origin write Request for API route tests (reserve, checkout, admin PATCH). */
export function apiWriteRequest(url: string, init: RequestInit = {}): Request {
  return new Request(url, {
    ...init,
    headers: withTrustedOrigin(init.headers),
  });
}

export async function withPatchedMethod<T extends object, K extends keyof T, R>(
  target: T,
  key: K,
  replacement: T[K],
  run: () => Promise<R> | R,
): Promise<R> {
  const original = target[key];
  (target as Record<PropertyKey, unknown>)[key as PropertyKey] =
    replacement as unknown;

  try {
    return await run();
  } finally {
    (target as Record<PropertyKey, unknown>)[key as PropertyKey] =
      original as unknown;
  }
}

export async function withTemporaryEnv<R>(
  updates: EnvUpdates,
  run: () => Promise<R> | R,
): Promise<R> {
  const previousValues: EnvUpdates = {};

  for (const [key, value] of Object.entries(updates)) {
    previousValues[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await run();
  } finally {
    for (const [key, value] of Object.entries(previousValues)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}
