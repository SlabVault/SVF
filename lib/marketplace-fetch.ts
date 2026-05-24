type MarketplaceWriteInit = Omit<RequestInit, "method" | "body"> & {
  body?: unknown;
};

/**
 * Same-origin marketplace write with JSON body (reserve, checkout).
 * Browser fetch sends Origin automatically for CSRF checks.
 */
export async function marketplaceWrite(
  url: string,
  init: MarketplaceWriteInit = {},
): Promise<Response> {
  const { body, headers, ...rest } = init;
  const mergedHeaders = new Headers(headers);
  if (body !== undefined && !mergedHeaders.has("Content-Type")) {
    mergedHeaders.set("Content-Type", "application/json");
  }

  return fetch(url, {
    method: "POST",
    credentials: "same-origin",
    ...rest,
    headers: mergedHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
