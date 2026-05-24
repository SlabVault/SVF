import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getArchivedRouteNotice,
  parseArchivedRouteSource,
} from "@/lib/redirect-notices";

test("parseArchivedRouteSource accepts known archived routes", () => {
  assert.equal(parseArchivedRouteSource("vault-shop"), "vault-shop");
  assert.equal(parseArchivedRouteSource("discover"), "discover");
  assert.equal(parseArchivedRouteSource("marketplace"), "marketplace");
  assert.equal(parseArchivedRouteSource("vault-purchases"), "vault-purchases");
  assert.equal(parseArchivedRouteSource(undefined), null);
  assert.equal(parseArchivedRouteSource("unknown"), null);
});

test("getArchivedRouteNotice returns user-facing copy", () => {
  const notice = getArchivedRouteNotice("vault-shop");
  assert.match(notice.title, /Trade/i);
  assert.ok(notice.body.length > 20);
});
