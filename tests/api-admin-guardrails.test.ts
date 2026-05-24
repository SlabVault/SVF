import assert from "node:assert/strict";
import test from "node:test";

import { GET as adminOpsStatusGet } from "../app/api/admin/ops-status/route";
import { POST as adminPricingPost } from "../app/api/admin/pricing/route";
import { GET as adminSchemaHealthGet } from "../app/api/admin/schema-health/route";
import {
  GET as adminSlabsGet,
  POST as adminSlabsPost,
} from "../app/api/admin/slabs/route";
import { GET as adminTransactionsGet } from "../app/api/admin/transactions/route";
import { GET as opsFeePreviewGet } from "../app/api/ops/fee-preview/route";
import { TENSOR_PROGRAM_IDS } from "@/lib/onchain/program-ids";
import { PATCH as adminFulfillPatch } from "../app/api/admin/transactions/[id]/fulfill/route";
import { prisma } from "../lib/prisma";
import {
  schemaHealthNonBlockingQueryResults,
  withMockedQueryRaw,
} from "./helpers/prisma-test-utils";
import {
  apiWriteRequest,
  withPatchedMethod,
  withTemporaryEnv,
} from "./helpers/test-helpers";

test("admin ops-status requires auth bearer token", async () => {
  await withTemporaryEnv({ ADMIN_PASSWORD: "secret" }, async () => {
    const request = new Request("http://localhost/api/admin/ops-status");
    const response = await adminOpsStatusGet(request);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.error, "Unauthorized");
    assert.equal(body.code, "ADMIN_AUTH_UNAUTHORIZED");
  });
});

test("ops fee-preview requires auth bearer token", async () => {
  await withTemporaryEnv({ ADMIN_PASSWORD: "secret" }, async () => {
    const request = new Request("http://localhost/api/ops/fee-preview");
    const response = await opsFeePreviewGet(request);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.error, "Unauthorized");
    assert.equal(body.code, "ADMIN_AUTH_UNAUTHORIZED");
  });
});

test("ops fee-preview returns previewFeeSplit for authorized caller", async () => {
  await withTemporaryEnv(
    {
      ADMIN_PASSWORD: "secret",
      SVF_BROKER_PUBKEY: "Broker1111111111111111111111111111111111111",
      SVF_BROKER_FEE_BPS: "250",
    },
    async () => {
      const request = new Request("http://localhost/api/ops/fee-preview", {
        headers: { authorization: "Bearer secret" },
      });
      const response = await opsFeePreviewGet(request);
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.tensorFeesProgram, TENSOR_PROGRAM_IDS.fees);
      assert.equal(body.brokerPubkey, "Broker1111111111111111111111111111111111111");
      assert.equal(body.targetBrokerBps, 250);
      assert.match(body.note, /devnet/);
    },
  );
});

test("admin fulfill rejects unauthorized requests", async () => {
  await withTemporaryEnv({ ADMIN_PASSWORD: "secret" }, async () => {
    const request = apiWriteRequest(
      "http://localhost/api/admin/transactions/tx_1/fulfill",
      { method: "PATCH" },
    );
    const response = await adminFulfillPatch(request, {
      params: Promise.resolve({ id: "tx_1" }),
    });
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.error, "Unauthorized");
    assert.equal(body.code, "ADMIN_AUTH_UNAUTHORIZED");
  });
});

test("admin fulfill role gate rejects insufficient JWT roles with ADMIN_FORBIDDEN", async () => {
  const { mock } = await import("node:test");
  const jwtModule = await import("next-auth/jwt");

  const getTokenMock = mock.method(jwtModule, "getToken", async () => ({
    sub: "admin",
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: "viewer",
  }));

  try {
    await withTemporaryEnv(
      {
        ADMIN_PASSWORD: "secret",
        NEXTAUTH_SECRET: "next-auth-secret",
        DATABASE_URL: "postgresql://example",
      },
      async () => {
        const request = apiWriteRequest(
          "http://localhost/api/admin/transactions/tx_1/fulfill",
          {
            method: "PATCH",
            body: JSON.stringify({ fulfillmentSignature: "fulfill_sig" }),
          },
        );

        const response = await adminFulfillPatch(request, {
          params: Promise.resolve({ id: "tx_1" }),
        });
        const body = await response.json();

        assert.equal(response.status, 403);
        assert.equal(body.code, "ADMIN_FORBIDDEN");
        assert.deepEqual(body.details.requiredRoles, ["admin"]);
      },
    );
  } finally {
    getTokenMock.mock.restore();
  }
});

test("admin pricing role gate rejects insufficient JWT roles with ADMIN_FORBIDDEN", async () => {
  const { mock } = await import("node:test");
  const jwtModule = await import("next-auth/jwt");

  const getTokenMock = mock.method(jwtModule, "getToken", async () => ({
    sub: "admin",
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: "viewer",
  }));

  try {
    await withTemporaryEnv(
      {
        ADMIN_PASSWORD: "secret",
        NEXTAUTH_SECRET: "next-auth-secret",
        DATABASE_URL: "postgresql://example",
      },
      async () => {
        const request = apiWriteRequest("http://localhost/api/admin/pricing", {
          method: "POST",
          body: JSON.stringify({ slabId: "slab_1", solPrice: 1, svfPrice: 2 }),
        });

        const response = await adminPricingPost(request);
        const body = await response.json();

        assert.equal(response.status, 403);
        assert.equal(body.code, "ADMIN_FORBIDDEN");
        assert.deepEqual(body.details.requiredRoles, ["admin"]);
      },
    );
  } finally {
    getTokenMock.mock.restore();
  }
});

test("admin slabs write role gate rejects insufficient JWT roles with ADMIN_FORBIDDEN", async () => {
  const { mock } = await import("node:test");
  const jwtModule = await import("next-auth/jwt");

  const getTokenMock = mock.method(jwtModule, "getToken", async () => ({
    sub: "admin",
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: "viewer",
  }));

  try {
    await withTemporaryEnv(
      {
        ADMIN_PASSWORD: "secret",
        NEXTAUTH_SECRET: "next-auth-secret",
        DATABASE_URL: "postgresql://example",
      },
      async () => {
        const request = apiWriteRequest("http://localhost/api/admin/slabs", {
          method: "POST",
          body: JSON.stringify({ name: "Test Slab" }),
        });

        const response = await adminSlabsPost(request);
        const body = await response.json();

        assert.equal(response.status, 403);
        assert.equal(body.code, "ADMIN_FORBIDDEN");
        assert.deepEqual(body.details.requiredRoles, ["admin"]);
      },
    );
  } finally {
    getTokenMock.mock.restore();
  }
});

test("admin slabs GET role gate rejects insufficient JWT roles with ADMIN_FORBIDDEN", async () => {
  const { mock } = await import("node:test");
  const jwtModule = await import("next-auth/jwt");

  const getTokenMock = mock.method(jwtModule, "getToken", async () => ({
    sub: "admin",
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: "viewer",
  }));

  try {
    await withTemporaryEnv(
      {
        ADMIN_PASSWORD: "secret",
        NEXTAUTH_SECRET: "next-auth-secret",
        DATABASE_URL: "postgresql://example",
      },
      async () => {
        const request = new Request("http://localhost/api/admin/slabs");
        const response = await adminSlabsGet(request);
        const body = await response.json();

        assert.equal(response.status, 403);
        assert.equal(body.code, "ADMIN_FORBIDDEN");
        assert.deepEqual(body.details.requiredRoles, ["admin"]);
      },
    );
  } finally {
    getTokenMock.mock.restore();
  }
});

test("admin transactions GET role gate rejects insufficient JWT roles with ADMIN_FORBIDDEN", async () => {
  const { mock } = await import("node:test");
  const jwtModule = await import("next-auth/jwt");

  const getTokenMock = mock.method(jwtModule, "getToken", async () => ({
    sub: "admin",
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: "viewer",
  }));

  try {
    await withTemporaryEnv(
      {
        ADMIN_PASSWORD: "secret",
        NEXTAUTH_SECRET: "next-auth-secret",
        DATABASE_URL: "postgresql://example",
      },
      async () => {
        const request = new Request("http://localhost/api/admin/transactions");
        const response = await adminTransactionsGet(request);
        const body = await response.json();

        assert.equal(response.status, 403);
        assert.equal(body.code, "ADMIN_FORBIDDEN");
        assert.deepEqual(body.details.requiredRoles, ["admin"]);
      },
    );
  } finally {
    getTokenMock.mock.restore();
  }
});

test("admin ops-status GET role gate rejects insufficient JWT roles with ADMIN_FORBIDDEN", async () => {
  const { mock } = await import("node:test");
  const jwtModule = await import("next-auth/jwt");

  const getTokenMock = mock.method(jwtModule, "getToken", async () => ({
    sub: "admin",
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: "viewer",
  }));

  try {
    await withTemporaryEnv(
      {
        ADMIN_PASSWORD: "secret",
        NEXTAUTH_SECRET: "next-auth-secret",
        DATABASE_URL: "postgresql://example",
      },
      async () => {
        const request = new Request("http://localhost/api/admin/ops-status");
        const response = await adminOpsStatusGet(request);
        const body = await response.json();

        assert.equal(response.status, 403);
        assert.equal(body.code, "ADMIN_FORBIDDEN");
        assert.deepEqual(body.details.requiredRoles, ["admin"]);
      },
    );
  } finally {
    getTokenMock.mock.restore();
  }
});

test("admin schema-health GET role gate rejects insufficient JWT roles with ADMIN_FORBIDDEN", async () => {
  const { mock } = await import("node:test");
  const jwtModule = await import("next-auth/jwt");

  const getTokenMock = mock.method(jwtModule, "getToken", async () => ({
    sub: "admin",
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: "viewer",
  }));

  try {
    await withTemporaryEnv(
      {
        ADMIN_PASSWORD: "secret",
        NEXTAUTH_SECRET: "next-auth-secret",
        DATABASE_URL: "postgresql://example",
      },
      async () => {
        const request = new Request("http://localhost/api/admin/schema-health");
        const response = await adminSchemaHealthGet(request);
        const body = await response.json();

        assert.equal(response.status, 403);
        assert.equal(body.code, "ADMIN_FORBIDDEN");
        assert.deepEqual(body.details.requiredRoles, ["admin"]);
      },
    );
  } finally {
    getTokenMock.mock.restore();
  }
});

test("admin fulfill blocks illegal status transitions with allowed transitions context", async () => {
  const prismaTransaction = prisma.transaction as unknown as {
    findUnique: (...args: unknown[]) => Promise<unknown>;
  };

  await withTemporaryEnv(
    {
      ADMIN_PASSWORD: "secret",
      DATABASE_URL: "postgresql://example",
    },
    async () => {
      await withPatchedMethod(
        prismaTransaction,
        "findUnique",
        async () => ({
          id: "tx_1",
          slabId: "slab_1",
          status: "FAILED",
          fulfillmentSignature: null,
        }),
        async () => {
          const request = new Request(
            "http://localhost/api/admin/transactions/tx_1/fulfill",
            {
              method: "PATCH",
              headers: { authorization: "Bearer secret" },
              body: JSON.stringify({ fulfillmentSignature: "fulfill_sig" }),
            },
          );

          const response = await withMockedQueryRaw(
            schemaHealthNonBlockingQueryResults(),
            async () =>
              adminFulfillPatch(request, {
                params: Promise.resolve({ id: "tx_1" }),
              }),
          );
          const body = await response.json();

          assert.equal(response.status, 409);
          assert.equal(body.code, "FULFILL_ILLEGAL_STATUS_TRANSITION");
          assert.equal(body.details.currentStatus, "FAILED");
          assert.deepEqual(body.details.allowedTransitions, []);
        },
      );
    },
  );
});

test("admin fulfill protects idempotent replay against signature mismatch", async () => {
  const prismaTransaction = prisma.transaction as unknown as {
    findUnique: (...args: unknown[]) => Promise<unknown>;
  };

  await withTemporaryEnv(
    {
      ADMIN_PASSWORD: "secret",
      DATABASE_URL: "postgresql://example",
    },
    async () => {
      await withPatchedMethod(
        prismaTransaction,
        "findUnique",
        async () => ({
          id: "tx_1",
          slabId: "slab_1",
          status: "COMPLETED",
          fulfillmentSignature: "existing_sig",
        }),
        async () => {
          const request = new Request(
            "http://localhost/api/admin/transactions/tx_1/fulfill",
            {
              method: "PATCH",
              headers: { authorization: "Bearer secret" },
              body: JSON.stringify({ fulfillmentSignature: "new_sig" }),
            },
          );
          const response = await withMockedQueryRaw(
            schemaHealthNonBlockingQueryResults(),
            async () =>
              adminFulfillPatch(request, {
                params: Promise.resolve({ id: "tx_1" }),
              }),
          );
          const body = await response.json();

          assert.equal(response.status, 409);
          assert.equal(body.code, "FULFILL_IDEMPOTENCY_SIGNATURE_MISMATCH");
          assert.equal(body.details.existingFulfillmentSignature, "existing_sig");
          assert.equal(body.details.providedFulfillmentSignature, "new_sig");
        },
      );
    },
  );
});
