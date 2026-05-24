import assert from "node:assert/strict";
import test from "node:test";

import {
  bearerChallengeHeader,
  validateBearerToken,
} from "../lib/http-auth";

test("validateBearerToken accepts matching bearer token", () => {
  const result = validateBearerToken("Bearer super-secret", "super-secret");
  assert.equal(result, "valid");
});

test("validateBearerToken rejects missing and wrong tokens", () => {
  assert.equal(validateBearerToken(null, "super-secret"), "missing");
  assert.equal(validateBearerToken("Bearer wrong", "super-secret"), "invalid");
  assert.equal(validateBearerToken("Basic abc", "super-secret"), "missing");
});

test("bearerChallengeHeader returns ops realm challenge", () => {
  const challenge = bearerChallengeHeader();
  assert.match(challenge["WWW-Authenticate"], /bearer/i);
  assert.match(challenge["WWW-Authenticate"], /svf-ops/i);
});
