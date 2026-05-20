import { PrismaClient } from "@prisma/client";

import slabsJson from "../data/slabs.json";

const prisma = new PrismaClient();

function defaultPrices(estimatedValueUsd: number | null) {
  const fmv = estimatedValueUsd ?? 50;
  return {
    solPrice: Math.max(0.1, Math.round((fmv / 150) * 100) / 100),
    svfPrice: Math.max(1000, Math.round(fmv * 100)),
  };
}

async function main() {
  for (const slab of slabsJson) {
    const { solPrice, svfPrice } = defaultPrices(slab.estimatedValueUsd);
    await prisma.slab.upsert({
      where: { id: slab.id },
      update: {
        name: slab.name,
        grade: slab.grade,
        estimatedValueUsd: slab.estimatedValueUsd,
        acquiredAt: new Date(slab.acquiredAt),
        imageUrl: slab.imageUrl,
        vaultedUrl: slab.vaultedUrl,
        collectrUrl: slab.collectrUrl?.trim() ? slab.collectrUrl : null,
        status: "AVAILABLE",
        solPrice,
        svfPrice,
      },
      create: {
        id: slab.id,
        name: slab.name,
        grade: slab.grade,
        estimatedValueUsd: slab.estimatedValueUsd,
        acquiredAt: new Date(slab.acquiredAt),
        imageUrl: slab.imageUrl,
        vaultedUrl: slab.vaultedUrl,
        collectrUrl: slab.collectrUrl?.trim() ? slab.collectrUrl : null,
        status: "AVAILABLE",
        solPrice,
        svfPrice,
      },
    });
  }

  console.log(`Seeded ${slabsJson.length} marketplace slabs from data/slabs.json`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
