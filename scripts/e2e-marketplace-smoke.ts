/**
 * Local smoke: reserve → checkout page URL (no on-chain payment).
 * Usage: npx tsx scripts/e2e-marketplace-smoke.ts [baseUrl]
 */
import { prisma } from "../lib/prisma";

const baseUrl = process.argv[2]?.replace(/\/$/, "") || "http://localhost:3000";
const buyerWallet = "11111111111111111111111111111112";

async function main() {
  const slab = await prisma.slab.findFirst({
    where: { status: "AVAILABLE" },
    select: { id: true, name: true },
  });

  if (!slab) {
    console.error("SMOKE_FAIL: no AVAILABLE slab in database");
    process.exit(1);
  }

  const healthRes = await fetch(`${baseUrl}/api/admin/schema-health`, {
    headers: { authorization: "Bearer invalid" },
  });
  const healthStatus = healthRes.status;

  const reserveRes = await fetch(`${baseUrl}/api/marketplace/reserve`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: baseUrl,
    },
    body: JSON.stringify({
      slabId: slab.id,
      buyerWallet,
      paymentSplit: "FIXED_DUAL",
    }),
  });
  const reserveBody = (await reserveRes.json()) as {
    error?: string;
    code?: string;
    recoveryHint?: string;
    transaction?: { id: string };
    checkoutUrl?: string;
  };

  console.log(
    JSON.stringify(
      {
        baseUrl,
        slab: { id: slab.id, name: slab.name },
        schemaHealthProbeStatus: healthStatus,
        reserve: {
          status: reserveRes.status,
          code: reserveBody.code,
          error: reserveBody.error,
          recoveryHint: reserveBody.recoveryHint,
          transactionId: reserveBody.transaction?.id ?? null,
          checkoutUrl: reserveBody.checkoutUrl ?? null,
        },
      },
      null,
      2,
    ),
  );

  if (reserveRes.status === 503 && reserveBody.code?.includes("SCHEMA")) {
    console.error("SMOKE_FAIL: schema still blocking reserve");
    process.exit(1);
  }

  if (reserveRes.status !== 200 || !reserveBody.transaction?.id) {
    console.error("SMOKE_FAIL: reserve did not return transaction");
    process.exit(1);
  }

  const checkoutPage = `${baseUrl}${reserveBody.checkoutUrl ?? `/vault/shop/checkout/${reserveBody.transaction.id}`}`;
  const pageRes = await fetch(checkoutPage);
  console.log(
    JSON.stringify(
      {
        checkoutPage,
        checkoutPageStatus: pageRes.status,
      },
      null,
      2,
    ),
  );

  if (pageRes.status !== 200) {
    console.error("SMOKE_FAIL: checkout page unreachable");
    process.exit(1);
  }

  // Release reservation for repeat runs
  await prisma.transaction.updateMany({
    where: { id: reserveBody.transaction.id, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
  await prisma.slab.updateMany({
    where: { id: slab.id, status: "RESERVED" },
    data: { status: "AVAILABLE" },
  });

  console.log("SMOKE_PASS");
}

main()
  .catch((error) => {
    console.error("SMOKE_FAIL:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
