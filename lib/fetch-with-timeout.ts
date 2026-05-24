/** Default outbound fetch budget for partner ingest / Tensor / Helius reads. */
export const DEFAULT_FETCH_TIMEOUT_MS = 12_000;

const DB_PROBE_TIMEOUT_MS = 5_000;

/**
 * fetch() with AbortController timeout — prevents partner listing loads from
 * hanging indefinitely when Tensor or Helius is slow/unreachable.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/** Race a promise against a timeout — resolves fallback on expiry (never rejects). */
export async function withTimeoutFallback<T>(
  promise: Promise<T>,
  fallback: T,
  timeoutMs: number,
  label = "operation",
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => {
          console.warn(`${label} timed out after ${timeoutMs}ms — using fallback`);
          resolve(fallback);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export { DB_PROBE_TIMEOUT_MS };
