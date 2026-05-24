import assert from "node:assert/strict";
import test from "node:test";

import {
  collectorCryptPullStableId,
  extractReplayIdFromClipUrl,
} from "../lib/scrapers/collector-crypt-scraper";
import { dedupePullItemsByReplayId } from "../lib/data-sync";
import type { PullItem } from "../types/content";

test("extractReplayIdFromClipUrl reads ?replay= query tokens", () => {
  assert.equal(
    extractReplayIdFromClipUrl(
      "https://gacha.collectorcrypt.com/?replay=cc-2daf7f1c-8553-437f-a57d-de42baf15abd",
    ),
    "cc-2daf7f1c-8553-437f-a57d-de42baf15abd",
  );
});

test("extractReplayIdFromClipUrl reads /r/ short replay paths", () => {
  assert.equal(
    extractReplayIdFromClipUrl("https://gacha.collectorcrypt.com/r/x843qqp9u5vf"),
    "x843qqp9u5vf",
  );
});

test("extractReplayIdFromClipUrl returns null for empty or unrelated URLs", () => {
  assert.equal(extractReplayIdFromClipUrl(""), null);
  assert.equal(extractReplayIdFromClipUrl("   "), null);
  assert.equal(
    extractReplayIdFromClipUrl("https://collectorcrypt.com/account/demo"),
    null,
  );
});

test("collectorCryptPullStableId prefixes replay-backed pulls", () => {
  assert.equal(
    collectorCryptPullStableId({
      id: "pull-0",
      clipUrl:
        "https://gacha.collectorcrypt.com/?replay=cc-a26c4d20-2702-4261-bd7a-853f68f2b3c7",
    }),
    "cc-replay-cc-a26c4d20-2702-4261-bd7a-853f68f2b3c7",
  );
  assert.equal(
    collectorCryptPullStableId({
      id: "pull-legacy",
      clipUrl: "",
    }),
    "pull-legacy",
  );
});

test("dedupePullItemsByReplayId collapses duplicate clip URLs", () => {
  const sharedClip = "https://gacha.collectorcrypt.com/r/x843qqp9u5vf";
  const pulls: PullItem[] = [
    {
      id: "pull-skarmory-may20",
      date: "2026-05-20",
      source: "Collector Crypt",
      summary: "Skarmory",
      costUsd: 45,
      outcomeUsd: 54,
      clipUrl: sharedClip,
      imageUrl: "https://example.com/skarmory.png",
    },
    {
      id: "pull-ancient-roar-may20",
      date: "2026-05-20",
      source: "Collector Crypt",
      summary: "Ancient Roar",
      costUsd: 35,
      outcomeUsd: 33,
      clipUrl: sharedClip,
      imageUrl: "https://example.com/ancient.png",
    },
  ];

  const deduped = dedupePullItemsByReplayId(pulls);

  assert.equal(deduped.length, 1);
  assert.equal(deduped[0]?.replayId, "x843qqp9u5vf");
  assert.equal(deduped[0]?.id, "cc-replay-x843qqp9u5vf");
  assert.equal(deduped[0]?.summary, "Ancient Roar");
  assert.equal(deduped[0]?.imageUrl, "https://example.com/ancient.png");
});
