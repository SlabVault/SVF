import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  TENSOR_PROGRAM_IDS,
  getTensorProgramId,
  useTensorMainnetPrograms,
} from "@/lib/onchain/program-ids";

describe("onchain program ids", () => {
  it("exposes Tensor mainnet marketplace id", () => {
    assert.equal(
      getTensorProgramId("marketplaceTcm"),
      "TCMPhJdwDryooaGtiocG1u3xcYbRpiJzb283XfCZsDp",
    );
  });

  it("includes fees escrow whitelist and amm as base58 pubkeys", () => {
    for (const id of Object.values(TENSOR_PROGRAM_IDS)) {
      assert.match(id, /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, `${id} (${id.length})`);
    }
  });

  it("defaults to mainnet-beta cluster for Tensor integrate mode", () => {
    const prev = process.env.SVF_ONCHAIN_CLUSTER;
    delete process.env.SVF_ONCHAIN_CLUSTER;
    assert.equal(useTensorMainnetPrograms(), true);
    if (prev !== undefined) process.env.SVF_ONCHAIN_CLUSTER = prev;
  });
});
