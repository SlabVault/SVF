import { jsonError } from "@/lib/api-errors";
import { bearerChallengeHeader, validateBearerToken } from "@/lib/http-auth";

/**
 * Authorize inbound partner ingest webhooks via Bearer token.
 * Returns null when authorized; otherwise a structured error Response.
 */
export function requirePartnerWebhookAuth(request: Request) {
  const secret = process.env.PARTNER_WEBHOOK_SECRET?.trim();

  if (!secret) {
    return jsonError({
      request,
      status: 503,
      code: "PARTNER_WEBHOOK_AUTH_NOT_CONFIGURED",
      message: "Partner webhook authentication is not configured.",
      recoveryHint: "Set PARTNER_WEBHOOK_SECRET before enabling partner webhooks.",
    });
  }

  if (
    validateBearerToken(request.headers.get("authorization"), secret) !==
    "valid"
  ) {
    return jsonError({
      request,
      status: 401,
      code: "PARTNER_WEBHOOK_UNAUTHORIZED",
      message: "Unauthorized",
      recoveryHint:
        "Provide Authorization: Bearer <PARTNER_WEBHOOK_SECRET> for partner webhook requests.",
      headers: bearerChallengeHeader(),
    });
  }

  return null;
}
