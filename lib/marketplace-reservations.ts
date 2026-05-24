import { prisma } from "@/lib/prisma";

const RESERVATION_TTL_MS = 15 * 60 * 1000;

export function getReservationExpiry(now = new Date()): Date {
  return new Date(now.getTime() + RESERVATION_TTL_MS);
}

export function isReservationExpired(reservedExpiresAt: Date | null): boolean {
  if (!reservedExpiresAt) return false;
  return reservedExpiresAt.getTime() <= Date.now();
}

export async function releaseExpiredReservations() {
  const now = new Date();

  const expired = await prisma.transaction.findMany({
    where: {
      status: "PENDING",
      reservedExpiresAt: { lte: now },
      slab: { status: "RESERVED" },
    },
    select: { id: true, slabId: true },
  });

  if (expired.length === 0) {
    return { releasedTransactions: 0, releasedSlabs: 0 };
  }

  const slabIds = [...new Set(expired.map((item) => item.slabId))];

  const [txUpdate, slabUpdate] = await prisma.$transaction([
    prisma.transaction.updateMany({
      where: {
        id: { in: expired.map((item) => item.id) },
        status: "PENDING",
      },
      data: { status: "CANCELLED" },
    }),
    prisma.slab.updateMany({
      where: {
        id: { in: slabIds },
        status: "RESERVED",
      },
      data: { status: "AVAILABLE" },
    }),
  ]);

  return {
    releasedTransactions: txUpdate.count,
    releasedSlabs: slabUpdate.count,
  };
}
