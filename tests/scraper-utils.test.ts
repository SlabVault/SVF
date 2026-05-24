import assert from "node:assert/strict";
import test from "node:test";

import {
  SCRAPER_MAX_RESPONSE_BYTES,
  SCRAPER_TIMEOUT_MS,
  getScraperAxiosGetOptions,
} from "../lib/scrapers/scraper-utils";

test("SCRAPER_MAX_RESPONSE_BYTES is 5 MB", () => {
  assert.equal(SCRAPER_MAX_RESPONSE_BYTES, 5_000_000);
});

test("getScraperAxiosGetOptions enforces size and timeout limits", () => {
  const options = getScraperAxiosGetOptions();

  assert.equal(options.maxContentLength, SCRAPER_MAX_RESPONSE_BYTES);
  assert.equal(options.maxBodyLength, SCRAPER_MAX_RESPONSE_BYTES);
  assert.equal(options.timeout, SCRAPER_TIMEOUT_MS);
  assert.equal(options.maxRedirects, 5);
  assert.match(options.headers["User-Agent"], /Chrome\/120/);
});
