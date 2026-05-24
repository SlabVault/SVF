import assert from "node:assert/strict";
import test from "node:test";

import { requirePartnerWebhookAuth } from "../lib/partner-webhook-auth";
import { withTemporaryEnv } from "./helpers/test-helpers";

test("requirePartnerWebhookAuth returns not-configured when secret missing", async () => {
  await withTemporaryEnv({ PARTNER_WEBHOOK_SECRET: undefined }, async () => {
    const request = new Request("http://localhost/api/partner/webhook", {
      method: "POST",
    });
    const response = requirePartnerWebhookAuth(request);
    assert.ok(response);

    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(body.ok, false);
    assert.equal(body.code, "PARTNER_WEBHOOK_AUTH_NOT_CONFIGURED");
  });
});

test("requirePartnerWebhookAuth returns unauthorized without bearer token", async () => {
  await withTemporaryEnv({ PARTNER_WEBHOOK_SECRET: "partner-secret" }, async () => {
    const request = new Request("http://localhost/api/partner/webhook", {
      method: "POST",
    });
    const response = requirePartnerWebhookAuth(request);
    assert.ok(response);

    const body = await response.json();
    assert.equal(response.status, 401);
    assert.equal(body.ok, false);
    assert.equal(body.code, "PARTNER_WEBHOOK_UNAUTHORIZED");
    assert.equal(body.error, "Unauthorized");
    assert.match(String(response.headers.get("www-authenticate")), /bearer/i);
  });
});

test("requirePartnerWebhookAuth rejects invalid bearer token", async () => {
  await withTemporaryEnv({ PARTNER_WEBHOOK_SECRET: "partner-secret" }, async () => {
    const request = new Request("http://localhost/api/partner/webhook", {
      method: "POST",
      headers: { authorization: "Bearer wrong-secret" },
    });
    const response = requirePartnerWebhookAuth(request);
    assert.ok(response);

    const body = await response.json();
    assert.equal(response.status, 401);
    assert.equal(body.code, "PARTNER_WEBHOOK_UNAUTHORIZED");
  });
});

test("requirePartnerWebhookAuth accepts valid bearer token", async () => {
  await withTemporaryEnv({ PARTNER_WEBHOOK_SECRET: "partner-secret" }, async () => {
    const request = new Request("http://localhost/api/partner/webhook", {
      method: "POST",
      headers: { authorization: "Bearer partner-secret" },
    });
    const response = requirePartnerWebhookAuth(request);
    assert.equal(response, null);
  });
});
