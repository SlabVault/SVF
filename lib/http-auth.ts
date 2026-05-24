import { timingSafeEqual } from "node:crypto";

export type BearerValidationResult = "valid" | "missing" | "invalid";

function extractBearerToken(header: string | null): string | null {
  if (!header) return null;
  const [scheme, token] = header.trim().split(/\s+/, 2);
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  return token;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function validateBearerToken(
  authorizationHeader: string | null,
  expectedToken: string | undefined,
): BearerValidationResult {
  const expected = expectedToken?.trim();
  if (!expected) return "invalid";

  const candidate = extractBearerToken(authorizationHeader);
  if (!candidate) return "missing";

  return safeEqual(candidate, expected) ? "valid" : "invalid";
}

export function bearerChallengeHeader(): Record<string, string> {
  return {
    "WWW-Authenticate": 'Bearer realm="svf-ops", charset="UTF-8"',
  };
}
