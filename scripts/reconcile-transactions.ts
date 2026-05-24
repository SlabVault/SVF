import { PrismaClient, SlabStatus, TransactionStatus } from "@prisma/client";
import {
  formatSchemaHealthForConsole,
  inspectSchemaHealth,
} from "../lib/schema-health";

type CliOptions = {
  apply: boolean;
  stalePendingMinutes: number;
  staleFulfillmentMinutes: number;
};

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOptions(): CliOptions {
  const args = process.argv.slice(2);
  const pendingArg = args.find((arg) => arg.startsWith("--stale-pending-minutes="));
  const fulfillmentArg = args.find((arg) =>
    arg.startsWith("--stale-fulfillment-minutes="),
  );

  return {
    apply: args.includes("--apply"),
    stalePendingMinutes: parsePositiveInt(
      pendingArg?.split("=")[1],
      30,
    ),
    staleFulfillmentMinutes: parsePositiveInt(
      fulfillmentArg?.split("=")[1],
      120,
    ),
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

async function main() {
  const options = parseOptions();
  const report = await inspectSchemaHealth({ forceRefresh: true });
  if (
    report.severity === "blocking" ||
    report.severity === "unconfigured" ||
    report.severity === "unreachable"
  ) {
    console.error("Reconciliation aborted: schema preflight did not pass.");
    console.error(formatSchemaHealthForConsole(report));
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const now = new Date();

  console.log("=== Transaction Reconciliation ===");
  console.log(`Mode: ${options.apply ? "apply" : "dry-run"}`);
  console.log(`Now: ${now.toISOString()}`);
  console.log(
    `Thresholds: stalePending=${options.stalePendingMinutes}m, staleFulfillment=${options.staleFulfillmentMinutes}m`,
  );

  try {
    const transactions = await prisma.transaction.findMany({
      select: {
        id: true,
        slabId: true,
        buyerWallet: true,
        status: true,
        reservedExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        transactionSignature: true,
        burnSignature: true,
        completedAt: true,
        fulfilledAt: true,
        slab: {
          select: {
            status: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const stalePendingCutoff = new Date(
      now.getTime() - options.stalePendingMinutes * 60_000,
    );
    const staleFulfillmentCutoff = new Date(
      now.getTime() - options.staleFulfillmentMinutes * 60_000,
    );

    const expiredPending = transactions.filter(
      (tx) =>
        tx.status === TransactionStatus.PENDING &&
        tx.reservedExpiresAt != null &&
        tx.reservedExpiresAt <= now,
    );

    const stalePending = transactions.filter(
      (tx) =>
        tx.status === TransactionStatus.PENDING &&
        tx.createdAt <= stalePendingCutoff,
    );

    const stalePendingFulfillment = transactions.filter(
      (tx) =>
        tx.status === TransactionStatus.PENDING_FULFILLMENT &&
        tx.fulfilledAt == null &&
        tx.updatedAt <= staleFulfillmentCutoff,
    );

    const progressionWithUnsoldSlab = transactions.filter(
      (tx) =>
        (tx.status === TransactionStatus.PENDING_FULFILLMENT ||
          tx.status === TransactionStatus.COMPLETED) &&
        tx.slab?.status !== SlabStatus.SOLD,
    );

    const pendingWithCheckoutSignatures = transactions.filter(
      (tx) =>
        tx.status === TransactionStatus.PENDING &&
        (tx.transactionSignature != null || tx.burnSignature != null),
    );

    const byTxSignature = new Map<string, string[]>();
    const byBurnSignature = new Map<string, string[]>();
    for (const tx of transactions) {
      if (tx.transactionSignature) {
        byTxSignature.set(tx.transactionSignature, [
          ...(byTxSignature.get(tx.transactionSignature) ?? []),
          tx.id,
        ]);
      }
      if (tx.burnSignature) {
        byBurnSignature.set(tx.burnSignature, [
          ...(byBurnSignature.get(tx.burnSignature) ?? []),
          tx.id,
        ]);
      }
    }

    const duplicateTransactionSignatures = [...byTxSignature.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([signature, ids]) => ({ signature, transactionIds: ids }));
    const duplicateBurnSignatures = [...byBurnSignature.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([signature, ids]) => ({ signature, transactionIds: ids }));

    console.log(`\nTotal transactions scanned: ${transactions.length}`);
    console.log(`Expired pending reservations: ${expiredPending.length}`);
    console.log(`Stale pending transactions: ${stalePending.length}`);
    console.log(`Stale pending fulfillment: ${stalePendingFulfillment.length}`);
    console.log(`Progressed tx with unsold slab: ${progressionWithUnsoldSlab.length}`);
    console.log(`Pending tx with checkout signatures: ${pendingWithCheckoutSignatures.length}`);
    console.log(
      `Duplicate tx signatures: ${duplicateTransactionSignatures.length}, duplicate burn signatures: ${duplicateBurnSignatures.length}`,
    );

    if (options.apply) {
      const expiredTxIds = expiredPending.map((tx) => tx.id);
      const expiredSlabIds = unique(expiredPending.map((tx) => tx.slabId));

      let cancelledExpiredCount = 0;
      let releasedExpiredSlabCount = 0;
      if (expiredTxIds.length > 0 || expiredSlabIds.length > 0) {
        const [txResult, slabResult] = await prisma.$transaction([
          prisma.transaction.updateMany({
            where: {
              id: { in: expiredTxIds },
              status: TransactionStatus.PENDING,
            },
            data: { status: TransactionStatus.CANCELLED },
          }),
          prisma.slab.updateMany({
            where: {
              id: { in: expiredSlabIds },
              status: SlabStatus.RESERVED,
            },
            data: { status: SlabStatus.AVAILABLE },
          }),
        ]);
        cancelledExpiredCount = txResult.count;
        releasedExpiredSlabCount = slabResult.count;
      }

      const progressedSlabIds = unique(
        progressionWithUnsoldSlab.map((tx) => tx.slabId),
      );
      let fixedProgressedSlabs = 0;
      if (progressedSlabIds.length > 0) {
        const result = await prisma.slab.updateMany({
          where: { id: { in: progressedSlabIds } },
          data: { status: SlabStatus.SOLD },
        });
        fixedProgressedSlabs = result.count;
      }

      console.log("\nApplied fixes:");
      console.log(`- Cancelled expired pending transactions: ${cancelledExpiredCount}`);
      console.log(`- Released expired reserved slabs: ${releasedExpiredSlabCount}`);
      console.log(`- Forced SOLD for progressed transaction slabs: ${fixedProgressedSlabs}`);
    } else {
      console.log(
        "\nDry-run only. Re-run with --apply to execute safe reconciliation writes.",
      );
    }

    const replaySuspects = [
      ...duplicateTransactionSignatures.map((item) => ({
        type: "transactionSignature",
        signature: item.signature,
        transactionIds: item.transactionIds,
      })),
      ...duplicateBurnSignatures.map((item) => ({
        type: "burnSignature",
        signature: item.signature,
        transactionIds: item.transactionIds,
      })),
    ];

    if (replaySuspects.length > 0) {
      console.log("\nReplay-suspect signatures:");
      for (const suspect of replaySuspects) {
        console.log(
          `- ${suspect.type}=${suspect.signature} -> ${suspect.transactionIds.join(", ")}`,
        );
      }
      console.log(
        "Operator action required: inspect suspect transaction IDs before any manual status changes.",
      );
    }

    if (stalePendingFulfillment.length > 0) {
      console.log("\nStale PENDING_FULFILLMENT transactions:");
      for (const tx of stalePendingFulfillment.slice(0, 25)) {
        console.log(
          `- ${tx.id} buyer=${tx.buyerWallet} updatedAt=${tx.updatedAt.toISOString()}`,
        );
      }
      if (stalePendingFulfillment.length > 25) {
        console.log(
          `- ... ${stalePendingFulfillment.length - 25} additional stale fulfillment transactions`,
        );
      }
      console.log(
        "Operator action required: verify slab transfers and mark fulfillment complete where appropriate.",
      );
    }

    if (pendingWithCheckoutSignatures.length > 0) {
      console.log("\nPending transactions with checkout signatures set:");
      for (const tx of pendingWithCheckoutSignatures.slice(0, 25)) {
        console.log(
          `- ${tx.id} txSig=${tx.transactionSignature ?? "null"} burnSig=${tx.burnSignature ?? "null"}`,
        );
      }
      if (pendingWithCheckoutSignatures.length > 25) {
        console.log(
          `- ... ${pendingWithCheckoutSignatures.length - 25} additional pending signature anomalies`,
        );
      }
      console.log(
        "Operator action required: inspect API logs for interrupted checkout confirmations.",
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("reconcile-transactions failed:", error);
  process.exit(1);
});
