import { NextResponse } from "next/server";

import { recordOperatorFailure } from "@/lib/operator-diagnostics";

type ErrorResponseOptions = {
  request: Request;
  status: number;
  code: string;
  message: string;
  details?: unknown;
  recoveryHint?: string;
  headers?: HeadersInit;
};

function routePathFromRequest(request: Request): string {
  try {
    return new URL(request.url).pathname;
  } catch {
    return "unknown";
  }
}

export function jsonError({
  request,
  status,
  code,
  message,
  details,
  recoveryHint,
  headers,
}: ErrorResponseOptions) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const route = routePathFromRequest(request);

  recordOperatorFailure({
    at: timestamp,
    route,
    status,
    code,
    message,
    requestId,
    recoveryHint,
  });

  return NextResponse.json(
    {
      ok: false,
      error: message,
      code,
      requestId,
      timestamp,
      path: route,
      ...(recoveryHint ? { recoveryHint } : {}),
      ...(details !== undefined ? { details } : {}),
    },
    {
      status,
      ...(headers ? { headers } : {}),
    },
  );
}
